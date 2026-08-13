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

#[derive(Deserialize, Debug)]
struct ClientEvent {
    event: String,
    data: serde_json::Value,
}


#[derive(Serialize, Clone)]
struct ServerEvent<T> {
    event: String,
    data: T,
}

fn send_to_client<T: Serialize>(tx: &broadcast::Sender<String>, event_name: &str, payload: T) {
    let packet = ServerEvent {
        event: event_name.to_string(),
        data: payload,
    };

    if let Ok(json) = serde_json::to_string(&packet) {
        // .send() diffuse le message à tous les abonnés connectés
        let _ = tx.send(json);
    }
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel::<String>(100);
    let tx = Arc::new(tx);

    let tx_clone = tx.clone();
    tokio::spawn(async move {
        let mut tick = 0;
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            tick += 1;

            // Le serveur envoie un tick en temps réel à tout le monde !
            send_to_client(&tx_clone, "tick:update", serde_json::json!({
                "tick": tick,
                "duration": 120
            }));
        }
    });

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .fallback_service(ServeDir::new("public"))
        .with_state(tx);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("🚀 Serveur actif sur http://0.0.0.0:3000");

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

    let mut rx = tx.subscribe();

    loop {
        tokio::select! {
            // ==========================================
            // SENS 1 : SERVEUR -> CLIENT (Notifications / Realtime)
            // ==========================================
            Ok(json_str) = rx.recv() => {
                if socket.send(Message::Text(json_str)).await.is_err() {
                    break;
                }
            }

            // ==========================================
            // SENS 2 : CLIENT -> SERVEUR (Événements / Actions)
            // ==========================================
            msg = socket.recv() => {
                if let Some(Ok(Message::Text(text))) = msg {
                    // On parse l'événement entrant du client
                    if let Ok(packet) = serde_json::from_str::<ClientEvent>(&text) {

                        // On route selon le nom de l'événement envoyé par le client
                        match packet.event.as_str() {
                            "music:play" => {
                                let music_id = packet.data["id"].as_str().unwrap_or("inconnu");
                                println!("📥 [Client -> Serveur] Événement 'music:play' reçu pour l'ID : {}", music_id);
                                // TODO: Lancer la musique avec ton bot Discord ici
                            },
                            "music:stop" => {
                                println!("📥 [Client -> Serveur] Événement 'music:stop' reçu.");
                                // TODO: Stopper la musique
                            },
                            other => {
                                println!("⚠️ Événement client inconnu : {}", other);
                            }
                        }
                    }
                } else {
                    break; // Déconnexion du client
                }
            }
        }
    }

    println!("Client déconnecté.");
}