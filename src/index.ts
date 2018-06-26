import { System } from 'ts-gb/dist/system';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from 'ts-gb/dist/display/display';
import { BUTTON } from 'ts-gb/dist/controls/joypad';
import Swal from 'sweetalert2';
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  DataTexture,
  RGBFormat,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh
} from 'three';

const SCALED_SCREEN_WIDTH = SCREEN_WIDTH * 3;
const SCALED_SCREEN_HEIGHT = SCREEN_HEIGHT * 3;
const CPU_CLOCK_FREQUENCY = 1024 * 1024;
const COLOR_DISABLED_SCREEN = [167, 188, 77];
const COLOR_PALETTE = [
  [155, 188, 15],
  [139, 172, 75],
  [48, 98, 48],
  [15, 56, 15],
];

// Create the system object which contains
// the CPU/MMU/...
const system = new System();

// Find the canvas that represents the LCD screen
const scene = new Scene();
const camera = new OrthographicCamera(
  SCALED_SCREEN_WIDTH / -2,
  SCALED_SCREEN_WIDTH / 2,
  SCALED_SCREEN_HEIGHT / 2,
  SCALED_SCREEN_HEIGHT / -2,
  -1,
  1
);

const renderer = new WebGLRenderer();
renderer.setSize(SCALED_SCREEN_WIDTH, SCALED_SCREEN_HEIGHT);

// Append the renderer to the LCD container
const lcdContainer = document.getElementById('lcd-container');
if (lcdContainer !== null) {
  lcdContainer.appendChild(renderer.domElement);
}

// Status flags
let gameRomLoaded = false;
let emulationPaused = false;

// Handle file loads
const createFileSelectListener = (type: string) => (event: Event) => {
  const files =  (event.target as HTMLInputElement).files;
  if (files && files[0]) {
    const reader = new FileReader();
    reader.onload = ((file: File) => (e: any) => {
      const fileData = e.target.result;

      try {
        switch (type) {
          case 'bootrom':
            system.loadBootRom(fileData);
            Swal({
              type: 'info',
              toast: true,
              position: 'top-end',
              text: 'Bootstrap ROM has been loaded successfuly',
              timer: 3000,
            });
            break;
          case 'rom':
            system.loadGame(fileData);
            gameRomLoaded = true;
            setEmulationPaused(false);
            Swal({
              type: 'info',
              toast: true,
              position: 'top-end',
              text: `ROM has been loaded successfuly:  ${file.name}`,
              timer: 3000,
            });
            break;
        }
      } catch (e) {
        Swal({
          type: 'error',
          title: 'Oops!',
          html: `Could not load <strong>${file.name}</strong>:<br>${e}`,
        });
      }
    })(files[0]);

    reader.readAsArrayBuffer(files[0]);
  }
};

const loadBootromBtn = document.getElementById('load-bootrom-btn');
if (loadBootromBtn !== null) {
  loadBootromBtn.addEventListener(
    'change',
    createFileSelectListener('bootrom')
  );
}

const loadRomBtn = document.getElementById('load-rom-btn');
if (loadRomBtn) {
  loadRomBtn.addEventListener(
    'change',
    createFileSelectListener('rom')
  );
}

// Stats
let fps: number = 0;
let tps: number = 0;
const statsElement = document.getElementById('lcd-stats');
if (statsElement) {
  const updateStats = () => {
    statsElement.innerText = `FPS: ${fps}, CPU: ${(tps / CPU_CLOCK_FREQUENCY).toFixed(2)}Mhz`;
    fps = 0;
    tps = 0;
  };

  setInterval(updateStats, 1000);
}

// Controls
const setEmulationPaused = (paused: boolean) => {
  emulationPaused = paused;

  const controlsElt = document.getElementById('lcd-controls');
  if (controlsElt) {
    controlsElt.classList.toggle('state-paused', emulationPaused);
  }
};

const playButton = document.querySelector('#lcd-controls .play-button');
if (playButton) {
  playButton.addEventListener('click', () => setEmulationPaused(false));
}

const pauseButton = document.querySelector('#lcd-controls .pause-button');
if (pauseButton) {
  pauseButton.addEventListener('click', () => setEmulationPaused(true));
}

// Handle keypresses
const keyMap: { [index: number]: BUTTON } = {
  38: BUTTON.UP,
  40: BUTTON.DOWN,
  37: BUTTON.LEFT,
  39: BUTTON.RIGHT,
  65: BUTTON.A,
  66: BUTTON.B,
  32: BUTTON.SELECT,
  13: BUTTON.START,
};

window.addEventListener('keydown', event => {
  if (keyMap.hasOwnProperty(event.keyCode)) {
    system.joypad.down(keyMap[event.keyCode]);
  }
});

window.addEventListener('keyup', event => {
  if (keyMap.hasOwnProperty(event.keyCode)) {
    system.joypad.up(keyMap[event.keyCode]);
  }
});

// Prepare scene
const screenDataBuffer = new Uint8Array(3 * SCREEN_WIDTH * SCREEN_HEIGHT);
for (let line = 0; line < SCREEN_HEIGHT; line++) {
  for (let column = 0; column < SCREEN_WIDTH; column++) {
    const startIndex = (line * SCREEN_WIDTH * 3) + (column * 3);
    screenDataBuffer[startIndex] = COLOR_DISABLED_SCREEN[0];
    screenDataBuffer[startIndex + 1] = COLOR_DISABLED_SCREEN[1];
    screenDataBuffer[startIndex + 2] = COLOR_DISABLED_SCREEN[2];
  }
}

const screenTexture = new DataTexture(screenDataBuffer, SCREEN_WIDTH, SCREEN_HEIGHT, RGBFormat);
screenTexture.flipY = true;
screenTexture.needsUpdate = true;

const screenMesh = new Mesh(
  new PlaneGeometry(SCALED_SCREEN_WIDTH, SCALED_SCREEN_HEIGHT),
  new MeshBasicMaterial({ map: screenTexture })
);

scene.add(screenMesh);

// Game loop
let lastLoopTime: number|null = null;

const gameLoop = (loopTime: number) => {
  let deltaLoopTime: number|null = null;
  if (lastLoopTime != null) {
    deltaLoopTime = loopTime - lastLoopTime;
  }

  if (gameRomLoaded && !emulationPaused && deltaLoopTime) {
    // Run as many CPU ticks as needed based on the time
    // the previous frame took to process.
    const ticks = Math.min(
      (CPU_CLOCK_FREQUENCY * deltaLoopTime) / 1000,
      CPU_CLOCK_FREQUENCY
    );

    try {
      for (let i = 0; i < ticks; i++) {
        system.tick();
        tps++;
      }
    } catch (e) {
      Swal({
        type: 'error',
        title: 'Oops!',
        text: `An error occured:\n${e}`,
        // tslint:disable-next-line
        footer: '<a href="https://github.com/Lyrkan/ts-gb/issues" target="_blank">Open an issue on Github</a>'
      });
      console.error(e); // tslint:disable-line:no-console
      setEmulationPaused(true);
    }
  }

  if (gameRomLoaded) {
    // Draw buffer
    const buffer = system.display.getFrontBuffer();

    for (let line = 0; line < SCREEN_HEIGHT; line++) {
      for (let column = 0; column < SCREEN_WIDTH; column++) {
        const color = COLOR_PALETTE[buffer[line * SCREEN_WIDTH + column]];
        if (color) {
          const startIndex = (line * SCREEN_WIDTH * 3) + (column * 3);
          screenDataBuffer[startIndex] = color[0];
          screenDataBuffer[startIndex + 1] = color[1];
          screenDataBuffer[startIndex + 2] = color[2];
        }
      }
    }

    screenTexture.needsUpdate = true;
  }

  // Render current frame
  renderer.render(scene, camera);

  // Prepare for new frame
  fps++;
  lastLoopTime = loopTime;
  requestAnimationFrame(gameLoop);
};

// Start the game loop
requestAnimationFrame(gameLoop);
