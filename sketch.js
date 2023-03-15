var camWidth = 640;
var camHeight = 480;

var mapWidth; //width of map
var levelMap, tileSheet, collisionMap; //image assets

var mapPixelWidth, mapPixelHeight; //pixel height of map image that will be displayed

var tileSize = 16; //dimension of each tile
var tileAmount = 16; //how many possible tiles

var levelArray = []; //color keys from levelMap image
var keyArray = []; //color keys mapped to tiles on the tileSheet
var tiles = []; //tiles from tileSheet
var rescale = 2; //how much to zoom in on pixels
var tilesPerRow; //how wide the leevl is in tiles

var levelImage, colliderImage; //

//player parameters
var playerSize = 30;
var playerX = 60;
var playerY = 60;
var playerSpeed = 8;

var camPosX = 0; //position of camera relative to level image
var camPosY = 0;

var playerDisplayX = 0; //where on screen to display player
var playerDisplayY = 0;

var gameSection, tileSheetSection, tileSheetBuffer; //graphics buffers for game preview, tilesheet upsizing, and tilesheet that the user is editing

var currentColor; //current drawing color for editing tiles

function preload() {
    levelMap = loadImage('images/level_map.png');
    tileSheet = loadImage('images/tile_sheet.png');
    collisionMap = loadImage('images/collision_map.png');
    for (let i = 0; i < tileAmount; i++) {
        tiles.push(createGraphics(tileSize, tileSize)); //empty graphics for tiles
    }
    tilesPerRow = int(sqrt(tiles.length)); //width of level in tiles
}

function setup() {
    let thisCanvas = createCanvas(camWidth, camHeight + tileSheet.height * rescale * 4);
    thisCanvas.parent('game');

    //creating a tilesheet buffer for instantaneous editing: matches the original tile sheet file at a 1x1 pixel ratio
    tileSheetBuffer = createGraphics(tileSheet.width, tileSheet.height);
    tileSheetBuffer.image(tileSheet, 0, 0);
    tileSheetBuffer.noSmooth();
    tileSheetBuffer.noStroke();

    //upscaled version of the tilesheet, easier for user to see
    tileSheetSection = createGraphics(camWidth, tileSheet.height * rescale * 4);
    tileSheetSection.image(tileSheet, 0, 0, tileSheet.width * rescale * 4, tileSheet.height * rescale * 4);
    tileSheetSection.noSmooth();
    tileSheetSection.noStroke();

    //creating the initial map and the game section buffer, for live testing of the level
    gameSection = createGraphics(camWidth, camHeight);
    addTilesToArray(tileSheetBuffer, tiles); //extract tiles from tilesheet
    mapColorsToKey(tileSheet, keyArray); //extract corresponding colors from tilesheet
    mapKeystoLevel(levelMap, levelArray); //extract mapping of colors for the level
    createLevelImage(tileSize * rescale, levelMap.width, levelArray, keyArray, tiles, collisionMap); //generate image of level here
    gameSection.noSmooth(); //do not blur image
    gameSection.noStroke();
    gameSection.image(levelImage, 0, 0) //draw the level at the top left

    noStroke();
    currentColor = (color(0));
}

function draw() {
    //game-preview interaction
    movePlayer();
    cameraFollow(playerX, playerY, 0.2);

    //display game section
    gameSection.image(levelImage, camPosX, camPosY);
    gameSection.fill('#ffffff');
    gameSection.rect(playerDisplayX, playerDisplayY, playerSize);

    //display tilesheet editing section
    image(gameSection, 0, tileSheetSection.height);
    tileSheetSection.background(0);
    tileSheetSection.image(tileSheetBuffer, 0, 0, tileSheet.width * rescale * 4, tileSheet.height * rescale * 4);

    image(tileSheetSection, 0, 0, camWidth);

    //get click-input for drawing on the tilesheet
    if (mouseIsPressed) {
        if (keyIsDown(ALT)) {
            currentColor = get(mouseX, mouseY);
            return;
        }
        tileSheetBuffer.fill(currentColor);
        tileSheetBuffer.rect(floor(mouseX / rescale / 4), floor(mouseY / rescale / 4), 1, 1);
        addTilesToArray(tileSheetBuffer, tiles); //extract tiles from tilesheet
        createLevelImage(tileSize * rescale, levelMap.width, levelArray, keyArray, tiles, collisionMap);
    }
    rect(mouseX, mouseY, rescale * 4, rescale * 4);
}

//camera follows player with smooth lerp movement, and determines where to display player on screen
function cameraFollow(playerX, playerY, lerpSpeed) {
    //player is in center of screen by default
    playerDisplayX = camWidth / 2;
    playerDisplayY = camHeight / 2;

    //if player is at the side edges of the map
    if (playerX < camWidth / 2) {
        playerDisplayX = playerX;
    } else if (playerX > mapPixelWidth - camWidth / 2) {
        playerDisplayX = camWidth + playerX - mapPixelWidth;
    }

    //if player is at the upper/lower edges of the map
    if (playerY < camHeight / 2) {
        playerDisplayY = playerY;
    } else if (playerY > mapPixelHeight - camHeight / 2) {
        playerDisplayY = camHeight + playerY - mapPixelHeight;
    }

    //lerp between previous position and new position
    camPosX = lerp(camPosX, constrain(-playerX + camWidth / 2, -mapPixelWidth + camWidth, 0), lerpSpeed);
    camPosY = lerp(camPosY, constrain(-playerY + camHeight / 2, -mapPixelHeight + camHeight, 0), lerpSpeed);
}

//extract tiles from tilesheet
function addTilesToArray(tileSheetImg, tiles) { //tilesheet Image, tiles array
    let i = 0; //iterator for tile array index
    for (let y = 0; y < 4; y++) { //iterate through columns on tileSheet
        for (let x = 0; x < 4; x++) { //iterate through rows on tileSheet
            tiles[i].image(tileSheetImg, 0, 0, tileSize, tileSize, tileSize * x, tileSize * y, tileSize, tileSize); //slice the area of tileSheet for this tile
            i++; //go to next tile array index
        }
    }
}

//extract color key from bottom of tileSheet, and match the indexes (*3) to the order of the tile extraction. this array is 3 times as big as the tile array.
function mapColorsToKey(tileSheetImg, keyArray) { //tilesheet Image, color key array
    let keyPixels = createGraphics(tilesPerRow, tilesPerRow); //create small image buffer (only needs to fit the 16 key colors)
    keyPixels.image(tileSheetImg, 0, 0, tilesPerRow, tilesPerRow, 0, tilesPerRow * tileSize, tilesPerRow, tilesPerRow); //slice the part of the tilesheet that should have the key
    keyPixels.loadPixels(); //load the pixels of this slice
    for (let i = 0; i < keyPixels.pixels.length; i += 4) { //iterate through rbga values in increments of 4 (to land on the R value)
        keyArray.push(keyPixels.pixels[i]); //push the r value to the array
        keyArray.push(keyPixels.pixels[i + 1]); //push the g value to the array
        keyArray.push(keyPixels.pixels[i + 2]); //push the b value to the array; the a value isn't needed

    }
}

//analyze each pixel of the level map, place the r, g, and b values in an array
function mapKeystoLevel(lvlMapImg, levelArray) { //level map image, level color array
    let levelMapPixels = createGraphics(lvlMapImg.width, lvlMapImg.height); //create image buffer of level map to analyze
    levelMapPixels.image(lvlMapImg, 0, 0); //place level map into buffer
    levelMapPixels.loadPixels(); //load pixel array
    for (let i = 0; i < levelMapPixels.pixels.length; i += 4) { //iterate through rgba values in increments of 4 (to land on the R value)
        levelArray.push(levelMapPixels.pixels[i]); //push the r value to the array
        levelArray.push(levelMapPixels.pixels[i + 1]); //push the g value to the array
        levelArray.push(levelMapPixels.pixels[i + 2]); //push the b value to the array
    }
    mapPixelWidth = lvlMapImg.width * tileSize * rescale; //define the pixel width of the level image that will be displayed
    mapPixelHeight = lvlMapImg.height * tileSize * rescale; //define the pixel height of the level image that will be displayed
}

//produce the level image here, by creating the neccessary arrays, then analyzing the arrays to produce an image
function createLevelImage(tileSize, mapWidth, levelArray, keyArray, tileArray, collisionMap) {
    levelImage = createGraphics(mapPixelWidth, mapPixelHeight);
    levelImage.noSmooth();
    let row = 0;
    for (let i = 0; i < levelArray.length; i += 3) {
        let colorIndex = 0;
        if (i > 0 && (i / 3) % mapWidth == 0) {
            row++;
        }
        for (let j = 0; j < keyArray.length; j += 3) {
            if (keyArray[j] == levelArray[i] && keyArray[j + 1] == levelArray[i + 1] && keyArray[j + 2] == levelArray[i + 2]) {
                colorIndex = j;
            }
        }
        levelImage.image(tileArray[colorIndex / 3], (i / 3) % mapWidth * tileSize, row * tileSize, tileSize, tileSize);
    }
    colliderImage = createGraphics(mapPixelWidth, mapPixelHeight);
    colliderImage.noSmooth();
    colliderImage.image(collisionMap, 0, 0, mapPixelWidth, mapPixelHeight);
}

//for moving player in game preview
function movePlayer() {
    //collision point of player
    let playerCollisionX = playerX + playerSize / 2;
    let playerCollisionY = playerY + playerSize - 2;

    //player side boundaries for collision
    let playerRight = playerX + playerSize + playerSpeed;
    let playerLeft = playerX - playerSpeed;
    let playerTop = playerCollisionY - playerSpeed;
    let playerBottom = playerCollisionY + playerSpeed;

    //keyboard input for moving player
    if (keyIsDown(68) && red(colliderImage.get(playerRight, playerCollisionY)) == 255) { //right
        playerX += playerSpeed;
    } else if (keyIsDown(65) && red(colliderImage.get(playerLeft, playerCollisionY)) == 255) { //left
        playerX -= playerSpeed;
    }
    if (keyIsDown(83) && red(colliderImage.get(playerCollisionX, playerBottom)) == 255) { //down
        playerY += playerSpeed;
    } else if (keyIsDown(87) && red(colliderImage.get(playerCollisionX, playerTop)) == 255) { //up
        playerY -= playerSpeed;
    }
}

