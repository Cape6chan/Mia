use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
pub struct ClientEvent {
    pub(crate) event: String,
    pub(crate) data: serde_json::Value,
}
#[derive(Serialize, Clone)]
pub struct ServerEvent<T> {
    pub(crate) event: String,
    pub(crate) data: T,
}