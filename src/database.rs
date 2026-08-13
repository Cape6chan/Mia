use std::fs;
use axum::extract::ws::{Message, WebSocket};
use serde::Serialize;
use serde_json::Value;
use tokio::sync::broadcast;
use crate::types::ServerEvent;

pub fn read_db() -> Option<Value> {
    let chemin = "database/db.json";
    let contenu_json = fs::read_to_string(chemin).ok()?;
    serde_json::from_str::<Value>(&contenu_json).ok()
}

pub fn send_clients<T: Serialize>(tx: &broadcast::Sender<String>, event_name: &str, payload: T) {
    let packet = ServerEvent {
        event: event_name.to_string(),
        data: payload,
    };

    if let Ok(json) = serde_json::to_string(&packet) {
        let _ = tx.send(json);
    }
}

pub fn send_db_clients(tx: &broadcast::Sender<String>) {
    if let Some(parsed_data) = read_db() {
        send_clients(tx, "db:get", parsed_data);
    }
}

pub async fn send_db_client(socket: &mut WebSocket) {
    if let Some(parsed_data) = read_db() {
        let packet = ServerEvent {
            event: "db:get".to_string(),
            data: parsed_data,
        };

        if let Ok(json_final) = serde_json::to_string(&packet) {
            let _ = socket.send(Message::Text(json_final)).await;
        }
    }
}