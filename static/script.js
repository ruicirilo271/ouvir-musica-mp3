const albumsDiv = document.getElementById('albums');
const tracksSection = document.getElementById('tracks-section');
const tracksList = document.getElementById('tracks-list');
const albumNameSpan = document.getElementById('album-name');
const playerSection = document.getElementById('player-section');
const audioPlayer = document.getElementById('audio-player');
const currentTrackTitle = document.getElementById('current-track-title');
const loadingMessage = document.getElementById('loading-message');
const playAlbumBtn = document.getElementById('play-album-btn');
let playlist = [];
let currentIndex = 0;

document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return alert('Digite algo para pesquisar.');
    albumsDiv.innerHTML = '';
    const res = await fetch(`/search_album?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.status === 'success') {
        data.data.forEach(album => {
            const col = document.createElement('div');
            col.className = 'col-md-3';
            col.innerHTML = `<div class="card h-100 p-2 shadow-sm" role="button">
                <img src="${album.image}" class="card-img-top" alt="Capa">
                <div class="card-body">
                    <h5 class="card-title">${album.name}</h5>
                    <p class="card-text text-muted">${album.artist}</p>
                </div>
            </div>`;
            col.onclick = () => loadAlbum(album.artist, album.name);
            albumsDiv.appendChild(col);
        });
    }
};

async function loadAlbum(artist, album) {
    tracksList.innerHTML = '';
    albumNameSpan.textContent = `${album} - ${artist}`;
    const res = await fetch(`/album_tracks?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`);
    const data = await res.json();
    if (data.status === 'success') {
        data.data.forEach(track => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = track.name;
            li.onclick = () => playTrack(artist, track.name);
            tracksList.appendChild(li);
        });
        tracksSection.classList.remove('d-none');
        playlist = data.data.map(t => ({ artist, name: t.name }));
    }
}

async function playTrack(artist, track) {
    currentTrackTitle.textContent = track;
    loadingMessage.textContent = "Carregando música...";
    playerSection.classList.remove('d-none');
    const res = await fetch(`/play_track?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
    const data = await res.json();
    if (data.status === 'success') {
        audioPlayer.src = `/audio/${data.filename}`;
        audioPlayer.play();
    }
    loadingMessage.textContent = "";
}

playAlbumBtn.onclick = () => {
    if (playlist.length === 0) return;
    currentIndex = 0;
    playNextInPlaylist();
};

async function playNextInPlaylist() {
    if (currentIndex >= playlist.length) return;
    const track = playlist[currentIndex];
    await playTrack(track.artist, track.name);
    audioPlayer.onended = () => {
        currentIndex++;
        playNextInPlaylist();
    };
}