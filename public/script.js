class SimpleSocket {
    constructor(url) {
        this.ws = new WebSocket(url);
        this.listeners = {};

        this.ws.onmessage = (event) => {
            try {
                // On s'attend à recevoir du JSON formaté { event: "...", data: ... }
                const message = JSON.parse(event.data);
                
                // Si on a un écouteur enregistré pour cet événement, on l'appelle
                if (this.listeners[message.event]) {
                    this.listeners[message.event](message.data);
                }
            } catch (err) {
                console.error("Error parsing WebSocket:", err);
            }
        };

        this.ws.onopen = () => console.log("Socket connected!");
        this.ws.onclose = () => console.log("Socket Disconnected.");
    }

    // La méthode .on() que tu voulais !
    on(event, callback) {
        this.listeners[event] = callback;
    }

    // Pour envoyer des messages au serveur si besoin
    emit(event, data) {
        this.ws.send(JSON.stringify({ event, data }));
    }
}

const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const host = window.location.host;
const wsUrl = `${protocol}${host}/ws`;
const socket = new SimpleSocket(wsUrl);

const log = console.log;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

const localstorage_user_data = {
    data: {},
    read: () => {
        const new_data = localStorage.getItem('user_data')
        localstorage_user_data.data = new_data ? JSON.parse(new_data) : {
            music: {
                count_played: [],
            },
            tag: {
                count_played: [],
            },
            fav: {
                list: [],
            }
        }
        if (!new_data) localstorage_user_data.write();
    },
    write: () => localStorage.setItem('user_data', JSON.stringify(localstorage_user_data.data)),
    length: () => Object.keys(localstorage_user_data.data.music.count_played).length,
    sort: () => {
        localstorage_user_data.data.music.count_played.sort((a, b) => b.count - a.count);
        localstorage_user_data.data. tag .count_played.sort((a, b) => b.count - a.count);
    },
    inc: (id) => {
        let el = localstorage_user_data.data.music.count_played.find(el => el.id === id)
        if (el) {
            el.count++;
        } else {
            localstorage_user_data.data.music.count_played.push({id, count: 1});
        }
    },
    dec: (id) => {
        let el = localstorage_user_data.data.music.count_played.find(el => el.id === id)
        if (el) {
            el.count--;
        } else {
            localstorage_user_data.data.music.count_played.push({id, count: -1});
        }
    },
    toggleFav: (id) => {
        if (!localstorage_user_data.data.fav?.list) {
            localstorage_user_data.data.fav = {list: []}
        }
        let i = localstorage_user_data.data.fav.list.indexOf(id);
        if (i !== -1) {
            localstorage_user_data.data.fav.list.splice(i, 1);
            return false;
        } else localstorage_user_data.data.fav.list.push(id);
        return true;
    }
}

localstorage_user_data.read();


const apiYtDlp = {
    download: (v) => {
        const payload = {v}
        console.log(v);
        fetch('/api/yt-dlp', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
            }
        });
    }
}

const apiAddPosts = (...entries) => {
    // On transforme chaque tableau [author, name, path] en l'objet attendu par ton API
    const payload = entries.map(([author, name, path]) => ({
        post: {
            author: author,
            name: name,
            path: "/post/music/" + path,
            image: "/post/image/placeholder.png"
        }
    }));

    console.log("Payload groupé :", payload);

    fetch('/api/add-post', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json",
        }
    });
}

function newestPost(dateStr) {
    const cible = new Date(dateStr.replace(" ", "T"));
    const maintenant = new Date();
    const limite = 3 * 24 * 60 * 60 * 1000;

    return (maintenant - cible) < limite;
}

function initDragScroll() {
    const pages = document.querySelectorAll('.page');

    pages.forEach(slider => {
        let isDown = false;
        let startX, scrollLeft, lastX;
        let mouseDownX; // Position initiale absolue pour comparer au relâchement
        let velX = 0;
        let momentumID;

        const beginMomentum = () => {
            slider.scrollLeft = Math.round(slider.scrollLeft + velX);
            velX *= 0.95;
            if (Math.abs(velX) > 1) {
                momentumID = requestAnimationFrame(beginMomentum);
            } else {
                velX = 0;
            }
        };

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            cancelAnimationFrame(momentumID);
            velX = 0;

            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            mouseDownX = e.pageX; // On mémorise le point de départ précis
            scrollLeft = slider.scrollLeft;
            lastX = e.pageX - slider.offsetLeft;
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - slider.offsetLeft;
            const walk = x - startX;

            // Calcul de la vitesse
            velX = lastX - x;
            lastX = x;

            // On n'applique le scroll que si on dépasse un petit seuil
            if (Math.abs(e.pageX - mouseDownX) > 5) {
                e.preventDefault();
                slider.scrollLeft = scrollLeft - walk;
            }
        });

        slider.addEventListener('mouseup', (e) => {
            if (!isDown) return;
            isDown = false;
            slider.style.cursor = 'grab';

            // CALCUL DE LA DISTANCE FINALE
            const deltaX = Math.abs(e.pageX - mouseDownX);

            if (deltaX < 10) {
                // C'EST UN CLIC : On arrête tout mouvement et on laisse l'event naturel
                velX = 0;
            } else {
                // C'EST UN DRAG : On lance l'inertie et on bloque le clic
                beginMomentum();
                const preventClick = (e) => {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                };
                slider.addEventListener('click', preventClick, { capture: true, once: true });
            }
        });

        slider.addEventListener('mouseleave', () => {
            if (isDown) {
                isDown = false;
                slider.style.cursor = 'grab';
                beginMomentum();
            }
        });
    });
}

// On l'appelle une fois au tout début au cas où
initDragScroll();


const uploadInput = document.getElementById('image-upload-input');
const uploadTrigger = document.getElementById('upload-trigger');

// Ouvre l'explorateur de fichiers au clic sur le bouton
uploadTrigger.addEventListener('click', () => uploadInput.click());

uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        // Envoi du fichier au serveur
        socket.emit('image:upload', {
            name: file.name,
            type: file.type,
            data: reader.result // ArrayBuffer
        });
    };
    reader.readAsArrayBuffer(file);
    
    // Reset l'input pour pouvoir uploader le même fichier deux fois si besoin
    uploadInput.value = '';
});


function refreshFavList() {
    localstorage_user_data.read();
    createPostElement()
}

const context_menu = document.querySelector("#context-menu")

let currentContextID = null;
let currentContextElement = null;

function contextShowMenu(e) {
    e.preventDefault();
    
    let pos = {x: e.clientX, y: e.clientY};
    context_menu.style.top = `${pos.y+10}px`;
    context_menu.style.left = `${pos.x+10}px`;

    context_menu.classList.remove("hidden");
}

function contextDisableButtons() {
    document.querySelectorAll("#context-menu > *").forEach(e => {
        e.classList.remove("enabled");
    });
}
function contextShowPostButtons() {
    contextDisableButtons();
    [
        "#context-play-only-btn",
        "#context-add-queue-btn",
        "#context-fav-btn",
        "#context-edit-btn"
    ]
    .forEach(e => {
        context_menu.querySelector(e).classList.add("enabled");
    });
}
function contextShowDocButtons() {
    contextDisableButtons();
    [
        "#context-add-post-btn"
    ]
    .forEach(e => {
        context_menu.querySelector(e).classList.add("enabled");
    });
}

document.addEventListener('contextmenu', (e) => {
    if (!event.target.closest('.post') && !e.target.closest('header') && !e.target.closest('footer')) {
        contextShowMenu(e);
        contextShowDocButtons();
    }
});

document.addEventListener('click', (e) => {
    if (!context_menu.contains(e.target) && !e.target.closest('.post'))
        context_menu.classList.add("hidden");
});


context_menu.querySelector("#context-add-post-btn").onclick = () => {
    const path = prompt("Ajouter une nouvelle Musique Vide ?")
    if (path)
        apiAddPosts([1, path.split('.').slice(0, -1).join(''), path]);

    context_menu.classList.add("hidden");
}

context_menu.querySelector("#context-play-only-btn").onclick = () => {
    socket.emit('state:only', [currentContextID]);

    context_menu.classList.add("hidden");
}
context_menu.querySelector("#context-add-queue-btn").onclick = () => {
    socket.emit('queue:add', {id: currentContextID});

    context_menu.classList.add("hidden");
}
context_menu.querySelector("#context-fav-btn").onclick = () => {
    const dbid = currentContextID;
    const el = currentContextElement;

    localstorage_user_data.read();
    const isFav = localstorage_user_data.toggleFav(dbid);
    localstorage_user_data.write();

    el.querySelector(".style-thumbnail").classList.toggle("fav", isFav);
    genereSearchList();
    if (el.classList.contains('search-post')) socket.emit("db:get");

    context_menu.classList.add("hidden");
}
context_menu.querySelector("#context-edit-btn").onclick = () => {
    const dbid = findPostByID(currentContextID);
    openEditModal(dbid);

    context_menu.classList.add("hidden");
}



let currentEditingID = null;

/**
 * Initialise le sélecteur d'images à partir de la DB
 */
function setupImageSelector(images) {
    const grid = document.querySelector("#image-grid-selector");
    const hiddenInput = document.querySelector("#edit-img-path");

    grid.innerHTML = "";
    images.forEach(imgPath => {
        const img = document.createElement("img");
        img.src = imgPath;
        img.classList.add("selectable-img");
        img.dataset.path = imgPath;

        img.addEventListener("click", () => {
            document.querySelectorAll(".selectable-img").forEach(i => i.classList.remove("selected"));
            img.classList.add("selected");
            hiddenInput.value = imgPath;
        });

        grid.appendChild(img);
    });
}

/**
 * Remplit le select des auteurs
 */
function setupAuthorSelect(authors) {
    const select = document.querySelector("#edit-author-id");
    select.innerHTML = authors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

/**
 * Ouvre la modal et pré-remplit les champs
 */
function openEditModal(postData) {
    currentEditingID = postData.id;
    
    document.querySelector("#edit-name").value = postData.name;
    document.querySelector("#edit-img-path").value = postData.image;
    document.querySelector("#edit-audio-path").value = postData.path;
    document.querySelector("#edit-preview-audio").src = postData.path;
    document.querySelector("#edit-author-id").value = postData.author;
    
    if(postData.date) {
        document.querySelector("#edit-date").value = postData.date.replace(" ", "T");
    }

    // Sélection visuelle dans la grille
    document.querySelectorAll(".selectable-img").forEach(img => {
        if (img.dataset.path === postData.image) {
            img.classList.add("selected");
            img.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            img.classList.remove("selected");
        }
    });

    document.querySelector("#edit-overlay").classList.remove("hidden");
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---

// Fermer la modal
document.querySelector("#edit-cancel-btn").addEventListener("click", () => {
    document.querySelector("#edit-overlay").classList.add("hidden");
});

// Soumettre le formulaire
document.querySelector("#edit-form").addEventListener("submit", (e) => {
    e.preventDefault();

    if (!confirm("Enregistrer les modifications sur ce post ?")) return;

    const updatedData = {
        id: currentEditingID,
        name: document.querySelector("#edit-name").value,
        author: parseInt(document.querySelector("#edit-author-id").value),
        image: document.querySelector("#edit-img-path").value,
        path: document.querySelector("#edit-audio-path").value,
        date: document.querySelector("#edit-date").value.replace("T", " ")
    };

    socket.emit('post:edit', updatedData);
    document.querySelector("#edit-overlay").classList.add("hidden");
});

// Mise à jour de l'audio si on change le texte manuellement
document.querySelector("#edit-audio-path").addEventListener("change", (e) => {
    document.querySelector("#edit-preview-audio").src = e.target.value;
});



const home_btn = document.querySelector("#home-btn");
const blind_test_btn = document.querySelector("#blind-test-btn");
const streamdeck_btn = document.querySelector("#streamdeck-btn")

const player_neuro_btn = document.querySelector("#player-neuro-btn");

const player_previous_btn = document.querySelector("#player-previous-btn");
const player_stop_btn = document.querySelector("#player-stop-btn");
const player_play_btn = document.querySelector("#player-play-btn");
const player_next_btn = document.querySelector("#player-next-btn");
const player_loop_btn = document.querySelector("#player-loop-btn");

const player_volume_slider = document.querySelector("#player-volume-slider");

const player_f_album = document.querySelector("#post-album");
const player_album = document.querySelector("#player-album");
const player_f_img = document.querySelector("#post-img");
const player_img = document.querySelector("#player-img");
const player_name = document.querySelector("#post-info h1");
const player_author = document.querySelector("#post-info h3");

const timecode_bar = document.querySelector('#timecode-bar');

function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const pad = (n) => n.toString().padStart(2, '0');

    if (h > 0) {
        return `${pad(h)}:${pad(m)}:${pad(s)}`; // 01:23:45
    } else {
        return `${pad(m)}:${pad(s)}`; // 23:45
    }
}

function findPostByID(id) {
    return db.post.find(item => item.id === id);
}
function findAuthorByID(id) {
    return db.author.find(item => item.id === id);
}
function findAlbumById(id) {
    return db.playlist.find(item => item.id === id);
}

function logQueue() {
    let output = []
    queue.forEach((id) => {
        output.push(findPostByID(id).name);
    })
    console.log(output);
}

function initDragScroll() {
    const pages = document.querySelectorAll('.page');

    pages.forEach(slider => {
        // SÉCURITÉ : On ne branche les événements qu'une seule fois
        if (slider.dataset.dragInit === "true") return;
        slider.dataset.dragInit = "true";

        let isDown = false;
        let startX, scrollLeft, startTime, startMouseX, lastX;
        let wasMoving = false;
        
        // Variables pour l'inertie
        let velX = 0;
        let momentumID;

        const beginMomentum = () => {
            // On applique le mouvement et la friction (0.95)
            slider.scrollLeft = Math.round(slider.scrollLeft + velX);
            velX *= 0.95;

            // Seuil d'arrêt : si c'est trop lent (< 1px), on coupe tout
            if (Math.abs(velX) > 1) {
                momentumID = requestAnimationFrame(beginMomentum);
            } else {
                velX = 0;
            }
        };

        slider.addEventListener('mousedown', (e) => {
            if (e.button === 2) return; 

            // On stoppe l'inertie en cours dès qu'on pose le doigt
            cancelAnimationFrame(momentumID);
            
            isDown = true;
            wasMoving = false;
            velX = 0; // Reset de la vitesse
            startTime = Date.now();
            startMouseX = e.pageX;
            lastX = e.pageX; // Pour le calcul de la vitesse initiale
            
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;

            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX);
            const distance = Math.abs(e.pageX - startMouseX);

            // Calcul de la vélocité en temps réel
            velX = lastX - e.pageX;
            lastX = e.pageX;

            if (distance > 10) { 
                wasMoving = true;
                e.preventDefault(); 
                slider.scrollLeft = scrollLeft - walk;
            }
        });

        slider.addEventListener('mouseup', (e) => {
            if (!isDown) return;
            isDown = false;
            slider.style.cursor = 'grab';

            const distance = Math.abs(e.pageX - startMouseX);

            if (wasMoving || distance > 10) {
                // LANCEMENT DE L'INERTIE
                // On utilise setTimeout 0 pour laisser le clic se faire bloquer d'abord
                setTimeout(() => {
                    beginMomentum();
                }, 0);

                // BLOCAGE DU CLIC
                const preventClick = (e) => {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                };
                slider.addEventListener('click', preventClick, { capture: true, once: true });
            }
        });

        slider.addEventListener('mouseleave', () => {
            if (isDown) {
                isDown = false;
                slider.style.cursor = 'grab';
                beginMomentum();
            }
        });
    });
}

function createPostElement(dbp, customClass="") {
    const authorData = findAuthorByID(dbp.author);
    const newest = newestPost(dbp.date);

    const post = document.createElement("div");
    post.classList.add("post");
    if (customClass) post.classList.add(customClass);

    const frame = document.createElement("div");
    frame.classList.add("frame", "style-thumbnail");
    frame.classList.toggle("new", newest);

    let isFav = localstorage_user_data.data.fav?.list?.findIndex(item => item == dbp.id);
    if (isFav >= 0) frame.classList.add("fav");

    // Note: Tu peux décider d'appliquer le thème de l'auteur au post aussi
    if (authorData.theme === "light") frame.classList.add("light");
    
    const img = document.createElement("img");
    img.src = dbp.image;
    img.loading = "lazy"; // Pour l'optimisation

    const overlay = document.createElement("div");
    overlay.classList.add("overlay-play");
    
    const h1 = document.createElement("h1");
    h1.innerText = dbp.name;

    frame.appendChild(img);
    frame.appendChild(overlay);
    post.appendChild(frame);
    post.appendChild(h1);

    post.addEventListener("click", () => {
        socket.emit('queue:add', {id: dbp.id});

        localstorage_user_data.read();
        localstorage_user_data.inc(dbp.id);
        localstorage_user_data.write();
    });
    post.addEventListener("contextmenu", (e) => {
        contextShowMenu(e)
        contextShowPostButtons();
        currentContextID = dbp.id;
        currentContextElement = post;
    });

    return post;
}

const getFavs = () => {
    localstorage_user_data.read();
    
    const list = localstorage_user_data.data.fav?.list;
    if (!list) return [];

    // 1. On récupère les éléments de la DB et on filtre les undefined
    const favPosts = list
        .map(selection => findPostByID(selection))
        .filter(musique => musique !== undefined);

    // 2. On range par ordre alphabétique selon le nom de la musique
    favPosts.sort((a, b) => a.name.localeCompare(b.name));

    return favPosts;
};

const getRecommendations = (type) => {
    localstorage_user_data.read();
    // 1. On récupère les données sources (on filtre déjà ceux à 0)
    let list = [...localstorage_user_data.data.music.count_played].filter(item => item.count >= 1);

    const modes = ['top', 'flop', 'random'];
    const selectedMode = modes[Math.floor(Math.random() * modes.length)];

    // 2. On applique le tri selon le choix
    switch (type) {
        case 'top': // Les plus joués
            list.sort((a, b) => b.count - a.count);
            break;
        case 'flop': // Les moins joués
            list.sort((a, b) => a.count - b.count);
            break;
        case 'random': // Aléatoire complet
            list.sort(() => Math.random() - 0.5);
            break;
        default:
            console.warn("Type de recommandation inconnu");
    }

    // 3. On prend les 10 premiers et on fait la jointure avec la DB
    const dbMap = new Map(db.post.map(m => [m.id, m]));

    return list
        .slice(0, 10) // On limite à 10
        .map(selection => dbMap.get(selection.id))
        .filter(musique => musique !== undefined);
};

const searchInput = document.querySelector("#search-input");

function genereSearchList(e) {
    const query = e?.target.value.toLowerCase().trim() || "";
    const main_content = document.querySelector("#main-content");
    
    // 1. Chercher ou Créer la section de recherche
    let searchPage = document.querySelector("#search-results");
    
    if (!searchPage) {
        searchPage = document.createElement("div");
        searchPage.id = "search-results";
        searchPage.classList.add("page");
        // On l'insère au tout début du main_content
        main_content.prepend(searchPage);
    }

    const suggest_mode = query === ""
    let results;

    // 2. Si vide, on nettoie et on arrête
    if (suggest_mode) {
        localstorage_user_data.read();

        if (localstorage_user_data.length() === 0) {
            searchPage.innerHTML = "";
            searchPage.classList.add("empty");
            return;
        }

        searchPage.classList.add("suggest");

        results = getFavs(); //getRecommendations("top");

    } else {
        searchPage.classList.remove("empty");
        searchPage.classList.remove("suggest");

        results = db.post.filter(p => 
            p.name.toLowerCase().includes(query)
        );
    }

    // 4. Construction de la structure div.page > div.list > posts
    searchPage.innerHTML = ""; // Reset visuel

    if (results.length > 0) {
        const listDiv = document.createElement("div");
        listDiv.classList.add("list");

        results.forEach(dbp => {
            listDiv.appendChild(createPostElement(dbp, "search-post"));
        });

        searchPage.appendChild(listDiv);
        
        // Relancer le scroll si nécessaire
        if (typeof initDragScroll === "function") initDragScroll();
    }
}

searchInput.addEventListener("input", genereSearchList);

let state = {};
let queue = [];
let db = {};

socket.on("state:get", (data) => {
    state = data;
    player_play_btn.classList.toggle("playing", state.playing)
    player_stop_btn.classList.toggle("queue", state.id !== null || queue.length>0);
    player_loop_btn.classList.toggle("active", state.looping);
    player_volume_slider.value = state.volume * 100

    if (!state) return;
    const dbp = findPostByID(state.id)
    if (!dbp) return;
    const dba = findAuthorByID(dbp.author)

    const dbal = findAlbumById(state.album);
    if (dbal) {
        player_album.src = dbal.image;
    }
    
    player_f_album.classList.toggle("show", dbal?true:false)
    player_img.src = dbp.image;
    player_name.innerText = dbp.name;
    player_author.innerText = dbal ? dbal.name : dba.name;
    player_f_img.classList.toggle("light", dba.theme === "light");
});

socket.on("queue:get", (data) => {
    queue = data; // On stocke la liste d'IDs
    
    // État du bouton stop
    player_stop_btn.classList.toggle("queue", state.id !== null || queue.length > 0);

    const list = document.querySelector("#queue-list .list");
    if (!list) return;

    list.innerHTML = ""; // Nettoyage du main à chaque update

    queue.forEach((queueItem, i) => {
        // On récupère les infos complètes via ton helper
        const postData = findPostByID(queueItem);

        if (!postData) {
            console.warn(`Post ID ${queueItem} non trouvé dans la DB.`);
            return; // On passe au suivant
        }

        const newest = newestPost(postData.date);

        // Création de la ligne
        const post = document.createElement("div");
        post.classList.add("post");

        // Thumbnail
        const imgContainer = document.createElement("div");
        imgContainer.classList.add("style-thumbnail");
        imgContainer.classList.toggle("new", newest);

        
        const img = document.createElement("img");
        img.src = postData.image || "/post/image/placeholder.png";
        imgContainer.appendChild(img);

        post.appendChild(imgContainer);
        list.appendChild(post);

        post.addEventListener("click", () => {
            socket.emit('state:skip', i+1);
        });
        post.addEventListener("contextmenu", (e) => {
            e.preventDefault(); // Empêche le menu contextuel du navigateur de s'ouvrir

            // On crée une copie de la queue sans l'élément à l'index i
            localstorage_user_data.read();
            localstorage_user_data.dec(queue[i]);
            localstorage_user_data.write();

            const newQueue = [...queue];
            newQueue.splice(i, 1); 


            // On met à jour la queue sur le serveur
            socket.emit('queue:set', newQueue);
        });
    });

    // Relancer le drag scroll si tu l'utilises aussi ici
    if (typeof initDragScroll === "function") initDragScroll();
});

socket.on("db:get", (data) => {
    if (!data) return;
    db = data;

    //setupImageSelector(db.file.image);
    setupAuthorSelect(db.author);

    const main_content = document.querySelector("#main-content");
    main_content.innerHTML = ""; // On vide tout le contenu du main_content

    // 1. Créer un dictionnaire des auteurs pour un accès rapide
    const authorsMap = {};
    db.author.forEach(a => {
        authorsMap[a.id] = a;
    });

    // 2. Grouper les posts par auteur
    const grouped = {};
    db.post.forEach(post => {
        if (!grouped[post.author]) grouped[post.author] = [];
        grouped[post.author].push(post);
    });

    // 3. Trier les noms d'auteurs par ordre alphabétique
    const sortedAuthorIds = Object.keys(grouped).sort((a, b) => {
        const nameA = authorsMap[a]?.name || "";
        const nameB = authorsMap[b]?.name || "";
        return nameA.localeCompare(nameB);
    });

    // 4. Générer chaque page d'auteur
    sortedAuthorIds.forEach(authorId => {
        const authorData = authorsMap[authorId];
        const posts = grouped[authorId];

        // Création de la <div class="page">
        const page = document.createElement("div");
        page.classList.add("page");

        // --- PARTIE GAUCHE : L'AUTEUR ---
        const authorDiv = document.createElement("div");
        authorDiv.classList.add("author", "style-thumbnail", "neon");
        if (authorData.theme === "light") authorDiv.classList.add("light");

        const authImg = document.createElement("img");
        authImg.src = authorData.image;

        // AJOUT DE L'OVERLAY DU NOMBRE
        const countOverlay = document.createElement("div");
        countOverlay.classList.add("count-badge");
        // pl.list.length récupère le nombre d'IDs dans ton tableau list
        countOverlay.innerText = posts.length;
        
        const authH1 = document.createElement("h1");
        authH1.innerText = authorData.name;

        authorDiv.appendChild(authImg);
        authorDiv.appendChild(countOverlay);
        authorDiv.appendChild(authH1);
        page.appendChild(authorDiv);

        // --- PARTIE DROITE : LA LISTE (POSTS) ---
        const listDiv = document.createElement("div");
        listDiv.classList.add("list");

        // Trier les musiques de cet auteur par nom
        posts.sort((a, b) => a.name.localeCompare(b.name));

        const listID = [];

        posts.forEach(dbp => {
            listDiv.appendChild(createPostElement(dbp));

            listID.push(dbp.id);
        });

        page.appendChild(listDiv);
        main_content.appendChild(page);

        authorDiv.addEventListener("click", () => {
            socket.emit('queue:set', listID);
        });
    });



    // PLAYLIST
    if (db.playlist && db.playlist.length > 0) {
        // Création de la div .page pour les playlists
        const playlistPage = document.createElement("div");
        playlistPage.id = "playlist"; // Comme dans ton exemple
        playlistPage.classList.add("page");

        // Création de la div .list
        const listDiv = document.createElement("div");
        listDiv.classList.add("list");

        db.playlist.forEach(pl => {
            const post = document.createElement("div");
            post.classList.add("post");

            const frame = document.createElement("div");
            frame.classList.add("frame", "style-thumbnail");

            const img = document.createElement("img");
            img.src = pl.image || "/post/image/placeholder.png";

            // AJOUT DE L'OVERLAY DU NOMBRE
            const countOverlay = document.createElement("div");
            countOverlay.classList.add("count-badge");
            // pl.list.length récupère le nombre d'IDs dans ton tableau list
            countOverlay.innerText = pl.list ? pl.list.length : 0; 

            const h1 = document.createElement("h1");
            h1.innerText = pl.name;

            // Assemblage
            frame.appendChild(img);
            frame.appendChild(countOverlay); // On met le badge dans la frame
            post.appendChild(frame);
            post.appendChild(h1);

            post.addEventListener("click", () => {
                socket.emit('playlist:play', pl.id);
            });

            listDiv.appendChild(post);
        });

        playlistPage.appendChild(listDiv);
        
        // On l'ajoute au début (prepend) ou à la fin (appendChild) du main-content
        main_content.prepend(playlistPage); 
    }




    // 5. Relancer le script de Drag-Scroll (Inertie)
    // Assure-toi que ton code de scroll est dans une fonction appelable
    if (typeof initDragScroll === "function") {
        initDragScroll();
    }

    genereSearchList();
});

/*socket.on("online:update", ({online_users, client_count}) => {
    const users = online_users;
    const count = client_count;

    const container = document.getElementById('client-online');
    if (!container) return;
    
    container.innerHTML = '';

    // 🛡️ Sécurité : Si 'users' est nul/undefined, on prend un tableau vide
    const safeUsers = users || [];

    // Si 'users' est un objet ({ socketId: user }), on extrait les valeurs,
    // sinon si c'est déjà un Array, on l'utilise directement.
    const userList = Array.isArray(safeUsers) ? safeUsers : Object.values(safeUsers);

    userList.forEach(user => {
        // Ignorer si un élément du tableau est nul
        if (!user) return;

        const img = document.createElement('img');
        img.classList.add('user-avatar');
        img.src = user.avatar || '/assets/default-avatar.png';
        img.alt = user.name || 'Utilisateur';
        img.title = user.name || 'Utilisateur';

        container.appendChild(img);
    });
});*/

socket.on("tick:update", ({tick, duration}) => {
    timecode_bar.style.width = `${clamp(tick/duration*100+1, 0, 100)}%`;
});
socket.on('image:upload:success', (newPath) => {
    log("Image uploadée avec succès !");
});

home_btn.onclick = () => {
    socket.emit('db:get')
}
blind_test_btn.onclick = () => {
    document.body.classList.toggle("blind-test-mode");
}
player_previous_btn.onclick = () => {
    socket.emit('state:previous');
}
player_stop_btn.onclick = () => {
    socket.emit('state:stop');
}
player_play_btn.onclick = () => {
    if (state.playing)
        socket.emit('state:pause');
    else
        socket.emit('state:resume');
}
player_next_btn.onclick = () => {
    socket.emit('state:skip');
}

player_loop_btn.onclick = () => {
    if (state.looping)
        socket.emit('state:unloop');
    else
        socket.emit('state:loop');
}

player_volume_slider.addEventListener('change', (e) => {
    const volume = e.target.value/100;
    socket.emit("state:volume", volume);
})


streamdeck_btn.addEventListener('click', e => {
    const docEl = document.documentElement;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Entrer en plein écran
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) { 
            docEl.webkitRequestFullscreen(); // Safari / iOS
        }
    } else {
        // Quitter le plein écran
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen(); // Safari / iOS
        }
    }
})

setTimeout(() => {
    document.querySelector('.steam-startup').remove();
}, 4500); // Supprime l'élément après l'animation (3.5s + 1s de marge)