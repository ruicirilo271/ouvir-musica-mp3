<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>LastFM Album MP3 Player</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .album, .track { cursor: pointer; margin: 5px 0; }
    .album:hover, .track:hover { color: blue; text-decoration: underline; }
    #audioPlayer { width: 100%; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Search Albums</h1>
  <input type="text" id="searchTerm" placeholder="Enter album name" />
  <button id="searchBtn">Search</button>

  <div id="albums"></div>
  <h2>Tracks</h2>
  <div id="tracks"></div>

  <audio id="audioPlayer" controls></audio>

  <script>
    const searchBtn = document.getElementById('searchBtn');
    const searchTerm = document.getElementById('searchTerm');
    const albumsDiv = document.getElementById('albums');
    const tracksDiv = document.getElementById('tracks');
    const audioPlayer = document.getElementById('audioPlayer');

    let currentArtist = '';
    let currentAlbum = '';
    let currentTracks = [];
    let currentTrackIndex = 0;

    searchBtn.onclick = () => {
      fetch(`/search_albums?album=${encodeURIComponent(searchTerm.value)}`)
        .then(res => res.json())
        .then(data => {
          albumsDiv.innerHTML = '';
          tracksDiv.innerHTML = '';
          data.forEach(album => {
            const div = document.createElement('div');
            div.textContent = `${album.name} - ${album.artist}`;
            div.classList.add('album');
            div.onclick = () => {
              currentArtist = album.artist;
              currentAlbum = album.name;
              fetch(`/album_tracks?artist=${encodeURIComponent(album.artist)}&album=${encodeURIComponent(album.name)}`)
                .then(res => res.json())
                .then(tracks => {
                  currentTracks = tracks;
                  currentTrackIndex = 0;
                  tracksDiv.innerHTML = '';
                  tracks.forEach((track, i) => {
                    const t = document.createElement('div');
                    t.textContent = track.name;
                    t.classList.add('track');
                    t.onclick = () => playTrack(i);
                    tracksDiv.appendChild(t);
                  });
                  // Botão ouvir album
                  const playAllBtn = document.createElement('button');
                  playAllBtn.textContent = 'Ouvir álbum';
                  playAllBtn.onclick = () => {
                    currentTrackIndex = 0;
                    playTrack(currentTrackIndex);
                  };
                  tracksDiv.appendChild(playAllBtn);
                });
            };
            albumsDiv.appendChild(div);
          });
        });
    };

    function playTrack(index) {
      if (index >= currentTracks.length) return;
      const track = currentTracks[index];
      const artist = currentArtist;
      const trackName = track.name;
      audioPlayer.src = `/download_mp3?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(trackName)}`;
      audioPlayer.play();
      currentTrackIndex = index;

      audioPlayer.onended = () => {
        currentTrackIndex++;
        if (currentTrackIndex < currentTracks.length) {
          playTrack(currentTrackIndex);
        }
      };
    }
  </script>
</body>
</html>
