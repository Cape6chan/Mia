use serenity::async_trait;
use serenity::model::gateway::Ready;
use serenity::prelude::*;
use songbird::SerenityInit;

struct Handler;

#[async_trait]
impl EventHandler for Handler {
    async fn ready(&self, _: Context, ready: Ready) {
        println!("🤖 Bot Discord connecté : {}!", ready.user.name);
    }
}

// Fonction principale pour lancer le bot en arrière-plan
pub async fn start_discord_bot(token: String) {
    let intents = GatewayIntents::GUILD_MESSAGES
        | GatewayIntents::DIRECT_MESSAGES
        | GatewayIntents::MESSAGE_CONTENT
        | GatewayIntents::GUILD_VOICE_STATES; // Obligatoire pour la voix !

    let mut client = Client::builder(&token, intents)
        .event_handler(Handler)
        .register_songbird() // <--- On enregistre Songbird ici pour l'audio
        .await
        .expect("Erreur lors de la création du client Discord");

    if let Err(why) = client.start().await {
        println!("Erreur critique avec le client Discord : {:?}", why);
    }
}

// --- Fonctions de contrôle (appelées depuis ton WebSocket) ---

pub fn play_music(id: &str) {
    println!("🎵 [Discord] Demande de lecture pour l'ID : {}", id);
    // TODO: Connecter au channel vocal et lancer la piste via Songbird
}

pub fn stop_music() {
    println!("🛑 [Discord] Arrêt de la musique demandé.");
    // TODO: Stopper la lecture
}

pub fn set_volume(volume: f64) {
    println!("🔊 [Discord] Réglage du volume global à : {}", volume);
    // TODO: Ajuster le gain de la piste en cours via Songbird
}