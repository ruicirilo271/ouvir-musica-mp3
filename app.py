import os
from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
from yt_dlp import YoutubeDL
from dotenv import load_dotenv

load_dotenv()
LASTFM_API_KEY = os.getenv('LASTFM_API_KEY')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

if not LASTFM_API_KEY or not YOUTUBE_API_KEY:
    raise RuntimeError("Defina LASTFM_API_KEY e YOUTUBE_API_KEY no arquivo .env")

app = Flask(__name__, static_folder='static', template_folder='templates')
DOWNLOAD_FOLDER = '/tmp'

os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

ydl_opts = {
    'format': 'bestaudio/best',
    'quiet': True,
    'no_warnings': True,
    'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(id)s.%(ext)s'),
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',
    }],
}

LASTFM_API_URL = 'http://ws.audioscrobbler.com/2.0/'
YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search'

def search_album(query):
    params = {
        'method': 'album.search',
        'album': query,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': 10
    }
    response = requests.get(LASTFM_API_URL, params=params)
    response.raise_for_status()
    data = response.json()
    return [{
        'name': a['name'],
        'artist': a['artist'],
        'image': a['image'][-1]['#text']
    } for a in data.get('results', {}).get('albummatches', {}).get('album', [])]

def get_album_tracks(artist, album):
    params = {
        'method': 'album.getinfo',
        'artist': artist,
        'album': album,
        'api_key': LASTFM_API_KEY,
        'format': 'json'
    }
    response = requests.get(LASTFM_API_URL, params=params)
    response.raise_for_status()
    data = response.json()
    tracks = data.get('album', {}).get('tracks', {}).get('track', [])
    if isinstance(tracks, dict):
        tracks = [tracks]
    return [{'name': t['name'], 'duration': t.get('duration', '0')} for t in tracks]

def youtube_search(query):
    params = {
        'key': YOUTUBE_API_KEY,
        'part': 'snippet',
        'q': query,
        'type': 'video',
        'maxResults': 1
    }
    response = requests.get(YOUTUBE_API_URL, params=params)
    response.raise_for_status()
    items = response.json().get('items', [])
    if not items:
        return None
    return items[0]['id']['videoId']

def download_audio(video_id):
    url = f'https://www.youtube.com/watch?v={video_id}'
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            return os.path.splitext(filename)[0] + '.mp3'
    except Exception as e:
        print(f"Erro: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search_album')
def search_album_route():
    q = request.args.get('q', '')
    try:
        albums = search_album(q)
        return jsonify({'status': 'success', 'data': albums})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/album_tracks')
def album_tracks_route():
    artist = request.args.get('artist', '')
    album = request.args.get('album', '')
    try:
        tracks = get_album_tracks(artist, album)
        return jsonify({'status': 'success', 'data': tracks})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/play_track')
def play_track_route():
    artist = request.args.get('artist', '')
    track = request.args.get('track', '')
    query = f"{artist} {track} official audio"
    video_id = youtube_search(query)
    if not video_id:
        return jsonify({'status': 'error', 'message': 'Vídeo não encontrado'}), 404
    filename = download_audio(video_id)
    if not filename:
        return jsonify({'status': 'error', 'message': 'Erro ao baixar'}), 500
    return jsonify({'status': 'success', 'filename': os.path.basename(filename)})

@app.route('/audio/<filename>')
def serve_audio(filename):
    return send_from_directory(DOWNLOAD_FOLDER, filename, mimetype='audio/mpeg')

if __name__ == '__main__':
    app.run(debug=True)