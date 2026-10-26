const player = document.querySelector('[data-film-player]');
const play = player?.querySelector('button');

if (player && play) {
  play.hidden = false;
  play.addEventListener('click', () => {
    const video = document.createElement('video');
    video.setAttribute('aria-label', 'FROM HERE — narrated demo, 1 minute 33 seconds');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.src = player.dataset.filmSrc;
    video.tabIndex = 0;
    player.replaceChildren(video);
    video.focus();
    // Native controls remain available if the browser declines playback.
    video.play().catch(() => {});
  }, { once: true });
}
