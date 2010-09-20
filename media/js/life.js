/* helper functions */

function make_empty_grid(width, height) {
    var grid = Array();
    for (var i=0; i<width; i++) {
        grid[i] = Array();
    }
    return grid;
}

function inject_randomness_in_grid(grid, width, height, rounds) {
    var rounds = (rounds == undefined) ? height*width/2 : rounds;
    for (var x=0; x<rounds; x++) {
        var i = Math.floor(Math.random()*width);
        var j = Math.floor(Math.random()*height);
        grid[i][j] = 1;
    }
    return grid;
}

function make_random_grid(width, height, rounds) {
    var grid = make_empty_grid(width, height);
    return inject_randomness_in_grid(grid, width, height, rounds);
}

function prepare_canvas(canvas) {
    var context = canvas.getContext('2d');
    canvas.width = screen.width;
    canvas.height = screen.height;
    return context;
}

this.clear_canvas = function (canvas) {
    canvas.getContext("2d").clearRect(0, 0,
            canvas.width, canvas.height);
}

/* Main class */

function Life(canvas_selector, options) {
    if (options == undefined) { options = {}};

    // initialize instance variables
    this.canvas = $(canvas_selector).get(0);
    this.context = prepare_canvas(this.canvas);
    this.cell_size = (options.cell_size == undefined) ? 20 : options.cell_size;
    this.grid_width = Math.floor(this.canvas.width / this.cell_size);
    this.grid_height = Math.floor(this.canvas.height / this.cell_size);
    if (options.pattern != undefined) {
        this.current = options.pattern;
    } else {
        this.current = make_random_grid(this.grid_width, this.grid_height, options.random_rounds);
    }
    this.successor = make_empty_grid(this.grid_width, this.grid_height);
    this.live_color = (options.live_color == undefined) ? "#000000" : options.live_color;
    // this.dead_color = (options.dead_color == undefined) ? "#000000" : dead_color;
    this.redraw_interval = (options.redraw_interval == undefined) ? 500 : options.redraw_interval;
    this.generation_count = 0;
    this.started = false;

    var this_ = this;

    // initialize methods
    // draw current population
    this.draw_population = function () {
        //console.log("Drawing population");
        this_.context.save();
        this_.context.fillStyle = this_.live_color;
        for (column in this_.current) {
            for (row in this_.current[column]) {
                if (this_.current[column][row]) {
                    this_.paint_cell(column, row);
                }
            }
        }
        this_.context.restore();
    }

    this.paint_cell = function (cellx, celly) {
        this_.context.fillRect(cellx*this_.cell_size,
                celly*this_.cell_size,
                this_.cell_size, this_.cell_size);
    }

    // swap current and successor
    this.swap_buffers = function () {
        var tmp = this_.current;
        this_.current = this_.successor;
        this_.successor = tmp;
    }

    // calculate successor from current
    this.next_generation = function () {
        for (cellx in this_.current) {
            for (celly in this_.current[cellx]) {
                this_.successor[cellx][celly] = this.decide(
                        parseInt(cellx),
                        parseInt(celly));
            }
        }
    }

    this.decide = function (cellx, celly) {
        var live_neighboors = this_.count_live_neightboors(cellx, celly);
        var dead_neighboors = 8 - live_neighboors;
        var is_live = this_.current[cellx][celly];
        var new_state = 0;
        if (is_live) {
            if (live_neighboors == 2 || live_neighboors == 3) {
                new_state = 1;
            }
        } else {
            if (live_neighboors == 3) {
                new_state = 1;
            }
        }
        return new_state;
    }

    this.neighboor_indexes = function (x, y) {
        return [
            [x-1, y],
            [x-1, y-1],
            [x, y-1],
            [x+1, y-1],
            [x+1, y],
            [x+1, y+1],
            [x, y+1],
            [x-1, y+1]
        ]
    }

    this.count_live_neightboors = function (cellx, celly) {
        var count = 0;
        var w = this_.grid_width;
        var h = this_.grid_height;

        var neighboors = this_.neighboor_indexes(cellx, celly);
        for (ni in neighboors) {
            neighboor = neighboors[ni]
            var nx = (neighboor[0] < 0) ? w - 1:
                (neighboor[0] >= w ? 0 : neighboor[0]);
            var ny = (neighboor[1] < 0) ? h - 1:
                (neighboor[1] >= h ? 0 : neighboor[1]);

            if (this_.current[nx][ny]) {
                count += 1;
            }
        }

        return count;
    }

    this.generation_step = function () {
        this_.generation_count += 1;
        //console.log("Generation", this_.generation_count);
        this_.next_generation();
        // single buffering animation
        clear_canvas(this_.canvas);
        this_.swap_buffers();
        this_.draw_population();
    }

    this.set_interval = function (new_interval, force_start) {
        clearInterval(this_.timer);
        this_.redraw_interval = new_interval;
        if ((!this_.started && force_start) || this_.started) {
            this_.timer = setInterval(this_.generation_step, new_interval);
            this_.started = true;
        }
    }

    this.pause = function () {
        clearInterval(this_.timer);
        this_.started = false;
    }

    this.start = function () {
        if (!this_.started) {
            this_.timer = setInterval(this_.generation_step,
                    this_.redraw_interval);
            this_.started = true;
        }
    }

    this.inject = function (count) {
        inject_randomness_in_grid(this_.current, this_.grid_width,
                this_.grid_height, count);
    }

}


