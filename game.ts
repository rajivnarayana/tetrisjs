document.addEventListener("DOMContentLoaded", () => {
    new Tetris(document);
});

const KEY_CODE_LEFT = 37;
const KEY_CODE_UP = 38;
const KEY_CODE_RIGHT = 39;
const KEY_CODE_DOWN = 40;
const KEY_CODE_SPACE = 32;
const KEY_CODE_ESC = 27;
const KEY_CODE_ENTER = 13;

const TYPE_ROTATE = 1;
const TYPE_MOVE_LEFT = 2;
const TYPE_MOVE_RIGHT = 3;

declare type Shape = number[][];

const LINE_WIDTH = 1;
const inset = (x, y) => {
    return [x * Tetris.CELL_SIZE + LINE_WIDTH, 
        y * Tetris.CELL_SIZE + LINE_WIDTH,
        Tetris.CELL_SIZE - 2 * LINE_WIDTH, 
        Tetris.CELL_SIZE - 2 * LINE_WIDTH
    ]
}

class Tetriment {
    static colors = ['white','red', 'green', 'blue', 'cyan', 'orange'];
    public color : number;
    constructor(public x : number, public y : number, public shape : Shape) {
        this.color = 1 + Date.now() % (Tetriment.colors.length - 1);
    }
    
    public draw(context: CanvasRenderingContext2D) {
        for (let col = 0; col < this.shape.length; col++) {
            for (let row = 0; row < this.shape[col].length; row++) {
                if (this.shape[col][row] != 0) {
                    Tetriment.drawCellWithInset(context, this.x + row, this.y + col, this.color);
                }
            }
        }
    }

    public rotateShapeClockWise() {
        const shape = this.shape;
        const rotatedShape = new Array(shape[0].length).fill(0).map(row => new Array(shape.length).map(_ => 0));
        for(let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                rotatedShape[col][shape.length - row - 1] = shape[row][col];
            }
        }
        this.shape = rotatedShape;
    }

    public moveLeft() {
        this.x -= 1;
    }

    public moveRight() {
        this.x += 1;
    }

    public moveDown() {
        this.y++;
    }

    static drawCellWithInset(context: CanvasRenderingContext2D, i : number,  j: number, color: number) {
        context.fillStyle = Tetriment.colors[color];
        context.fillRect(i * Tetris.CELL_SIZE + LINE_WIDTH, 
        j * Tetris.CELL_SIZE + LINE_WIDTH,
        Tetris.CELL_SIZE - 2 * LINE_WIDTH, 
        Tetris.CELL_SIZE - 2 * LINE_WIDTH);
    }
}

class Tetris {
    static CELLS_X = 10;
    static CELLS_Y = 20;
    static CELL_SIZE = 30;
    lastTimestamp = -10000;
    isPaused : boolean = false;
    velocity = 5;//units per second.
    board : number[][];
    keyQueue : number[] = [];
    
    static Shapes : number[][][]= [
        [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        [
            [0, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 1, 1],
            [0, 0, 0, 0],
        ],
        [
            [0, 0, 0, 0],
            [0, 0, 1, 0],
            [1, 1, 1, 0],
            [0, 0, 0, 0],
        ],
        [
            [1, 1, 0],
            [0, 1, 1],
        ],
        [
            [0, 1, 1],
            [1, 1, 0],
        ],
        [
            [1, 1, 1, 1],
        ],
        [
            [1, 1],
            [1, 1]
        ]
    ]

    currentShape : Tetriment;

    constructor(document) {
        this.board = new Array(Tetris.CELLS_Y).fill(0).map(val => new Array(Tetris.CELLS_X).fill(0));
        //Add keydown listeners.
        const container = document.getElementById("container");
        const canvas = document.createElement("canvas");
        container.appendChild(canvas);
        canvas.setAttribute("width", Tetris.CELLS_X * Tetris.CELL_SIZE);
        canvas.setAttribute("height", Tetris.CELLS_Y * Tetris.CELL_SIZE);
        const context = canvas.getContext("2d");
        this.addKeyBindings(document);
        this.currentShape = this.getRandomShape();
        this.tick(context);
    }
    
    addKeyBindings(document) {
        document.addEventListener("keydown", ({keyCode}) => {
            if (keyCode == KEY_CODE_LEFT) {
                this.keyQueue.push(TYPE_MOVE_LEFT);
            }
            if (keyCode == KEY_CODE_RIGHT) {
                this.keyQueue.push(TYPE_MOVE_RIGHT);
            }
            if (keyCode == KEY_CODE_UP || keyCode == KEY_CODE_SPACE) {
                this.keyQueue.push(TYPE_ROTATE);
            }
            if (keyCode == KEY_CODE_SPACE || KEY_CODE_ESC) {
                this.isPaused = true;
            }
        });
    }
    
    getRandomShape() : Tetriment {
        const shape = new Tetriment(4, 0, Tetris.Shapes[Math.floor(Math.random() * Tetris.Shapes.length)]);
        return shape;
        // const rotations = Math.floor(Math.random() * 3);
        // return new Tetriment(4, 0, Tetris.Shapes[6]);
    }
    
    update(context : CanvasRenderingContext2D, timestamp) {
        let needsUpdate = this.processKeyQueue();
        if ( timestamp - this.lastTimestamp > 1000/this.velocity ) {
            needsUpdate = true;
            this.lastTimestamp = timestamp;
            this.advance();
        }
        
        if (!needsUpdate) {
            return this.tick(context);
        }
        this.drawBoard(context);
        this.drawCurrentShape(context);
        this.keyQueue = [];
        this.tick(context);
    }
    
    processKeyQueue(): boolean {
        if (this.keyQueue.length == 0) {
            return false;
        }
        this.keyQueue.forEach(key => {
            if (key == TYPE_ROTATE) {
                this.currentShape.rotateShapeClockWise();
            } else if (key == TYPE_MOVE_LEFT) {
                this.currentShape.moveLeft();
                if (this.didCollide(this.currentShape)) {
                    this.currentShape.moveRight();
                }
            } else if (key == TYPE_MOVE_RIGHT) {
                this.currentShape.moveRight();
                if (this.didCollide(this.currentShape)) {
                    this.currentShape.moveLeft();
                }
            }
        });
        return true;
    }
    
    didCollide(tetriment : Tetriment) {
        return tetriment.shape.some((v, col) => 
                v.some((cell, row) => 
                    cell>0 && 
                    (tetriment.y + col >= Tetris.CELLS_Y  ||  
                    tetriment.x + row < 0 ||
                    tetriment.x + row >= Tetris.CELLS_X ||
                    this.board[tetriment.y + col][tetriment.x+row] > 0)
                ));
    }
    tick(context: CanvasRenderingContext2D) {
        requestAnimationFrame(this.update.bind(this, context));
    }
    
    drawCurrentShape(context: CanvasRenderingContext2D) {
        this.currentShape.draw(context);
    }

    advance() : boolean {
        this.currentShape.moveDown();
        if (this.didCollide(this.currentShape)) {
            this.currentShape.shape.forEach((v, col) => 
            v.forEach((cell, row) => {
                if (cell > 0) {
                    this.board[this.currentShape.y + col - 1][this.currentShape.x+row] = this.currentShape.color;
                }
            }));

            //Check if there are rows to be cleared.
            let row = Tetris.CELLS_Y - 1;
            do {
                if (this.board[row].every(cell => cell > 0)) {
                    this.board.splice(row, 1);
                    this.board.unshift(new Array(Tetris.CELLS_X).fill(0));
                } else {
                    row--;
                }
            } while(row >= 0)
            this.currentShape = this.getRandomShape();
        }
        return false;
    }

    drawBoard (context: CanvasRenderingContext2D) {
        context.strokeStyle = "lightgray";
        context.clearRect(0, 0, Tetris.CELLS_X * Tetris.CELL_SIZE, Tetris.CELLS_Y * Tetris.CELL_SIZE);
        context.strokeRect(0, 0, Tetris.CELLS_X * Tetris.CELL_SIZE, Tetris.CELLS_Y * Tetris.CELL_SIZE)
        // context.lineWidth = 0.25;
        context.moveTo(0,0);
        context.lineTo(Tetris.CELLS_X * Tetris.CELL_SIZE, 0);
        context.lineTo(Tetris.CELLS_X * Tetris.CELL_SIZE, Tetris.CELLS_Y * Tetris.CELL_SIZE);
        context.lineTo(0, Tetris.CELLS_Y * Tetris.CELL_SIZE);
        context.lineTo(0,0);
        for (let i = 1; i < Tetris.CELLS_X; i++) {
            context.moveTo(i * Tetris.CELL_SIZE, 0);
            context.lineTo(i * Tetris.CELL_SIZE, Tetris.CELLS_Y * Tetris.CELL_SIZE);
        }
        for (let i = 1; i < Tetris.CELLS_Y; i++) {
            context.moveTo(0 , i * Tetris.CELL_SIZE);
            context.lineTo(Tetris.CELLS_X * Tetris.CELL_SIZE, i * Tetris.CELL_SIZE);
        }
        context.stroke();
    
        //draw filled cells.
        this.board.forEach((_, col) => _.forEach((val, row) => {
            Tetriment.drawCellWithInset(context, row, col, val);
        }));
    }
}