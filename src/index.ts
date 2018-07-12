import 'babel-polyfill';
import { System } from 'ts-gb/dist/system';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from 'ts-gb/dist/display/display';
import { BUTTON } from 'ts-gb/dist/controls/joypad';
import { Database } from './database';
import * as Alerts from './alerts';

const WINDOW_SCALING = 3;
const CPU_CLOCK_FREQUENCY = 1024 * 1024;
const COLOR_OFF_SCREEN = '#EEEEEE';

// ------
// Initialize all components
// ------
const system = new System();

// ------
// Initialize canvas options
// ------
const canvas = document.getElementById('lcd');
const canvasContext = canvas ? (canvas as HTMLCanvasElement).getContext('2d') : null;
if (!canvas || !canvasContext) {
  throw new Error('Could not find LCD canvas');
}

canvas.style.width = `${SCREEN_WIDTH * WINDOW_SCALING}px` ;
canvas.style.height = `${SCREEN_HEIGHT * WINDOW_SCALING}px` ;
canvasContext.canvas.width = SCREEN_WIDTH * WINDOW_SCALING;
canvasContext.canvas.height = SCREEN_HEIGHT * WINDOW_SCALING;
canvasContext.imageSmoothingEnabled = false;
canvasContext.fillStyle = COLOR_OFF_SCREEN;
canvasContext.fillRect(0, 0, SCREEN_WIDTH * WINDOW_SCALING, SCREEN_HEIGHT * WINDOW_SCALING);

// ------
// Status flags
// ------
let gameRomLoaded = false;
let emulationPaused = false;

// ------
// Handle file loads
// ------
const database = new Database();

const loadBootRom = async (buffer: ArrayBuffer) => {
  system.loadBootRom(buffer);
};

const loadGame = async (filename: string, buffer: ArrayBuffer) => {
  system.loadGame(buffer);

  if (system.cartridge.cartridgeInfo.hasBattery) {
    // Add save handler
    let saveDebounce: any = null;
    system.cartridge.setRamChangedListener(() => {
      if (saveDebounce !== null) {
        clearTimeout(saveDebounce);
      }

      saveDebounce = setTimeout(() => {
        const ramContent = system.cartridge.getRamContent();
        database.saveGame(filename, ramContent).finally(() => {
          saveDebounce = null;
        });
      }, 500);
    });

    // Load previous save if there is one
    try {
      await database.loadGameSave(filename, system.cartridge);
    } catch (e) {
      Alerts.displayError(`Could not load save file: ${e}`);
      console.error(e); // tslint:disable-line:no-console
    }
  }
};

const createFileSelectListener = (type: string) => (event: Event) => {
  const files =  (event.target as HTMLInputElement).files;
  if (files && files[0]) {
    const reader = new FileReader();
    reader.onload = ((file: File) => (e: any) => {
      const fileData = e.target.result;
      switch (type) {
        case 'bootrom':
          loadBootRom(fileData).then(() => {
            Alerts.displayToast('Bootstrap ROM has been loaded successfuly');
          }).catch(error => {
            Alerts.displayError(`Could not load ROM <strong>${file.name}</strong>:<br>${error}`);
            console.error(error); // tslint:disable-line:no-console
          });
          break;
        case 'rom':
          loadGame(file.name, fileData).then(() => {
            gameRomLoaded = true;
            setEmulationPaused(false);
            Alerts.displayToast(`ROM has been loaded successfuly: <strong>${file.name}</strong>`);
          }).catch(error => {
            Alerts.displayError(`Could not load game <strong>${file.name}</strong>:<br>${error}`);
            console.error(error); // tslint:disable-line:no-console
          });
          break;
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

// ------
// Stats
// ------
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

// ------
// Controls
// ------
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

// ------
// Game loop
// ------
const imageDataBuffer = new Uint8ClampedArray(4 * SCREEN_WIDTH * SCREEN_HEIGHT);
const imageData = new ImageData(imageDataBuffer, SCREEN_WIDTH, SCREEN_HEIGHT);
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
      CPU_CLOCK_FREQUENCY / 30
    );

    try {
      for (let i = 0; i < ticks; i++) {
        system.tick();
        tps++;
      }
    } catch (e) {
      Alerts.displayError(`Runtime error: ${e}`);
      console.error(e); // tslint:disable-line:no-console
      setEmulationPaused(true);
    }
  }

  if (gameRomLoaded) {
    // Draw buffer
    const buffer = system.display.getFrontBuffer();

    for (let line = 0; line < SCREEN_HEIGHT; line++) {
      for (let column = 0; column < SCREEN_WIDTH; column++) {
        const startIndex = (line * SCREEN_WIDTH * 4) + (column * 4);
        imageDataBuffer[startIndex] = buffer[(line * SCREEN_WIDTH * 3) + (column * 3)];
        imageDataBuffer[startIndex + 1] = buffer[(line * SCREEN_WIDTH * 3) + (column * 3) + 1];
        imageDataBuffer[startIndex + 2] = buffer[(line * SCREEN_WIDTH * 3) + (column * 3) + 2];
        imageDataBuffer[startIndex + 3] = 255;
      }
    }

    createImageBitmap(imageData).then(bitmap => {
      canvasContext.drawImage(
        bitmap,
        0,
        0,
        SCREEN_WIDTH * WINDOW_SCALING,
        SCREEN_HEIGHT * WINDOW_SCALING
      );
    });
  }

  // Prepare for new frame
  fps++;
  lastLoopTime = loopTime;
  requestAnimationFrame(gameLoop);
};

// Start the game loop
requestAnimationFrame(gameLoop);
