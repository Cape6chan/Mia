mod database;
mod websocket;
mod discord;
mod types;

use database::*;
use websocket::*;

use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    // TX Broadcast Socket
    let (tx, _) = broadcast::channel::<String>(100);
    let tx = Arc::new(tx);
    /*let tx_clone = tx.clone();
    tokio::spawn(async move {
        let mut tick = 0;
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            tick += 1;

            // Le serveur envoie un tick en temps réel à tout le monde !
            send_clients(&tx_clone, "tick:update", serde_json::json!({
                "tick": tick,
                "duration": 120
            }));
        }
    });*/
    
    // Discord Bot
    let discord_token = "TON_TOKEN_DISCORD_ICI".to_string();

    // On lance le bot en arrière-plan
    tokio::spawn(async move {
        discord::start_discord_bot(discord_token).await;
    });
    
    
    // Web Route/Server
    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .fallback_service(ServeDir::new("public"))
        .nest_service("/post/image", ServeDir::new("post/image"))
        .nest_service("/post/music", ServeDir::new("post/music"))
        .with_state(tx);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:80").await.unwrap();
    println!("🚀 Serveur actif sur http://0.0.0.0:80");

    axum::serve(listener, app).await.unwrap();
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(tx): State<Arc<broadcast::Sender<String>>>
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, tx))
}

async fn handle_socket(mut socket: WebSocket, tx: Arc<broadcast::Sender<String>>) {
    println!("Client connecté !");

    // 1. Envoi initial de la DB au client
    send_db_client(&mut socket).await;

    let mut rx = tx.subscribe();

    loop {
        tokio::select! {
            // Écoute du serveur vers le client (Broadcast)
            Ok(json_str) = rx.recv() => {
                if socket.send(Message::Text(json_str)).await.is_err() {
                    break;
                }
            }

            // Écoute du client vers le serveur
            msg = socket.recv() => {
                // Si la connexion se coupe, on sort de la boucle
                let text = match process_incoming_message(msg).await {
                    Some(t) => t,
                    None => break,
                };

                // On traite l'événement reçu
                handle_client_event(&text, &tx);
            }
        }
    }

    println!("Client déconnecté.");
}