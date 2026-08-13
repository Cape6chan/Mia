use crate::database::send_db_clients;

use axum::extract::ws::Message;
use std::sync::Arc;
use tokio::sync::broadcast;
use crate::types::ClientEvent;

pub async fn process_incoming_message(msg: Option<Result<Message, axum::Error>>) -> Option<String> {
    match msg {
        Some(Ok(Message::Text(text))) => Some(text),
        _ => None, // Déconnexion ou erreur
    }
}

// Route l'événement client vers la bonne action
pub fn handle_client_event(text: &str, tx: &Arc<broadcast::Sender<String>>) {
    let packet = match serde_json::from_str::<ClientEvent>(text) {
        Ok(p) => p,
        Err(_) => return, // Ignore si le JSON est mal formé
    };

    match packet.event.as_str() {
        "db:get" => {
            send_db_clients(tx);
        },
        "music:play" => handle_music_play(&packet.data),
        "music:stop" => handle_music_stop(),
        "state:volume" => handle_volume(&packet.data),
        other => {
            println!("⚠️ Unknown event: {}\n payload: {}", other, packet.data);
        }
    }
}

pub fn handle_music_play(data: &serde_json::Value) {
    let music_id = data["id"].as_str().unwrap_or("inconnu");
    println!("📥 [Client -> Serveur] Événement 'music:play' reçu pour l'ID : {}", music_id);
    // TODO: Lancer la musique avec ton bot Discord ici
}

pub fn handle_music_stop() {
    println!("📥 [Client -> Serveur] Événement 'music:stop' reçu.");
    // TODO: Stopper la musique
}

pub fn handle_volume(data: &serde_json::Value) {
    let volume = data.as_f64().unwrap_or(0.2);
    println!("📥 [Client -> Serveur] Événement 'state:volume': {}", volume);
    // TODO: Changer le volume
}