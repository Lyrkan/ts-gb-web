import { System } from 'ts-gb/dist/system';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from 'ts-gb/dist/display/display';
import { BUTTON } from 'ts-gb/dist/controls/joypad';

const WINDOW_SCALING = 3;
const CPU_CLOCK_FREQUENCY = 1024 * 1024;
const COLOR_OFF_SCREEN = '#A7BC4D';
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
const canvas = document.getElementById('lcd');
const canvasContext = canvas ? (canvas as HTMLCanvasElement).getContext('2d') : null;
if (!canvas || !canvasContext) {
  throw new Error('Could not find LCD canvas');
}

// Initialize canvas options
canvas.style.width = `${SCREEN_WIDTH * WINDOW_SCALING}px` ;
canvas.style.height = `${SCREEN_HEIGHT * WINDOW_SCALING}px` ;
canvasContext.canvas.width = SCREEN_WIDTH * WINDOW_SCALING;
canvasContext.canvas.height = SCREEN_HEIGHT * WINDOW_SCALING;
canvasContext.imageSmoothingEnabled = false;
canvasContext.fillStyle = COLOR_OFF_SCREEN;
canvasContext.fillRect(0, 0, SCREEN_WIDTH * WINDOW_SCALING, SCREEN_HEIGHT * WINDOW_SCALING);

// Status flags
let gameRomLoaded = false;

// Handle file loads
const createFileSelectListener = (type: string) => (event: Event) => {
  const files =  (event.target as HTMLInputElement).files;
  if (files && files[0]) {
    const reader = new FileReader();
    reader.onload = ((file: File) => (e: any) => {
      const fileData = e.target.result;

      switch (type) {
        case 'bootrom':
          system.loadBootRom(fileData);
          break;
        case 'rom':
          system.loadGame(fileData);
          gameRomLoaded = true;
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

// Game loop
let lastLoopTime: number|null = null;
const gameLoop = (loopTime: number) => {
  let deltaTime: number|null = null;
  if (lastLoopTime != null) {
    deltaTime = loopTime - lastLoopTime;
  }

  if (gameRomLoaded && deltaTime) {
    // Run as many CPU ticks as needed based on the time
    // the previous frame took to process.
    const ticks = Math.min(
      (CPU_CLOCK_FREQUENCY * deltaTime) / 1000,
      CPU_CLOCK_FREQUENCY
    );

    for (let i = 0; i < ticks; i++) {
      system.tick();
      tps++;
    }
  }

  if (gameRomLoaded) {
    // Draw buffer
    const buffer = system.display.getFrontBuffer();

    const imageDataBuffer = new Uint8ClampedArray(4 * SCREEN_WIDTH * SCREEN_HEIGHT);

    for (let line = 0; line < SCREEN_HEIGHT; line++) {
      for (let column = 0; column < SCREEN_WIDTH; column++) {
        const colorIndex = buffer[line * SCREEN_WIDTH + column];
        const color = COLOR_PALETTE[colorIndex];

        if (color) {
          const startIndex = (line * SCREEN_WIDTH * 4) + (column * 4);
          imageDataBuffer[startIndex] = color[0];
          imageDataBuffer[startIndex + 1] = color[1];
          imageDataBuffer[startIndex + 2] = color[2];
          imageDataBuffer[startIndex + 3] = 255;
        }
      }
    }

    const imageData = new ImageData(imageDataBuffer, SCREEN_WIDTH, SCREEN_HEIGHT);
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
