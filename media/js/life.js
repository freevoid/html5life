/*
 * Copyright (C) 2011 by Nikolay Zakharov <nikolay@desh.su>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *     THE SOFTWARE.
 */

/* helper functions */

function classic_life(current_state, live_neighboors, dead_neighboors) {
    var new_state = 0;
    if (current_state) {
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

function make_decider(when_to_stay_live, when_to_liven) {
    return function (current_state, live_neighboors, dead_neighboors) {
        var new_state = 0;
        if (current_state) {
            if (when_to_stay_live.indexOf(live_neighboors) != -1) {
                new_state = 1;
            }
        } else {
            if (when_to_liven.indexOf(live_neighboors) != -1) {
                new_state = 1;
            }
        }
        return new_state;
    }
}

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
    var context = canvas.getContext('2d'),
        dims = get_doc_dimensions();

    canvas.width = dims[0];
    canvas.height = dims[1];
    return context;
}

function clear_canvas(canvas) {
    canvas.getContext("2d").clearRect(0, 0,
            canvas.width, canvas.height);
}

function arrays_eq(a1, a2) {
    if (a1.length != a2.length) {
        return false;
    }
    for (i in a1) {
        if (a1[i] != a2[i]) {
            return false;
        }
    }
    return true;
}

function get_window_dimensions() {
    var winW, winH;

    if (document.body && document.body.offsetWidth) {
        winW = document.body.offsetWidth;
        winH = document.body.offsetHeight;
    }
    if (document.compatMode=='CSS1Compat' &&
            document.documentElement &&
            document.documentElement.offsetWidth ) {
        winW = document.documentElement.offsetWidth;
        winH = document.documentElement.offsetHeight;
    }
    if (window.innerWidth && window.innerHeight) {
        winW = window.innerWidth;
        winH = window.innerHeight;
    }
    return [winW, winH];
}

function get_doc_dimensions() {
    var D = document,
        h, w;
    w = Math.max(
        Math.max(D.body.scrollWidth, D.documentElement.scrollWidth),
        Math.max(D.body.offsetWidth, D.documentElement.offsetWidth),
        Math.max(D.body.clientWidth, D.documentElement.clientWidth)
    );
    h = Math.max(
        Math.max(D.body.scrollHeight, D.documentElement.scrollHeight),
        Math.max(D.body.offsetHeight, D.documentElement.offsetHeight),
        Math.max(D.body.clientHeight, D.documentElement.clientHeight)
    );
    if (w == undefined) {
        return get_window_dimensions();
    }
    return [w, h];
}

/* Main class */

function Life(canvas, options) {
    if (options == undefined) { options = {}};

    // initialize instance variables
    this.canvas = canvas;
    this.context = prepare_canvas(this.canvas);
    this.cell_size = (options.cell_size == undefined) ? 20 : options.cell_size;
    this.grid_width = Math.floor(this.canvas.width / this.cell_size);
    this.grid_height = Math.floor(this.canvas.height / this.cell_size);
    if (options.pattern != undefined) {
        this.current = options.pattern;
    } else {
        if (options.fill_random) {
            this.current = make_random_grid(this.grid_width, this.grid_height, options.random_rounds);
        } else {
            this.current = make_empty_grid(this.grid_width, this.grid_height);
        }
    }
    this.successor = make_empty_grid(this.grid_width, this.grid_height);
    this.live_color = (options.live_color == undefined) ? "#000000" : options.live_color;
    // this.dead_color = (options.dead_color == undefined) ? "#000000" : dead_color;
    this.redraw_interval = (options.redraw_interval == undefined) ? 500 : options.redraw_interval;
    this.generation_count = 0;
    this.started = false;
    this.inner_decide_func = (options.decide_function == undefined) ? classic_life : options.decide_function;

    var this_ = this;

    this.init = function () {
        if (options.initial_draw) {
            this.draw_population()
        };
        this_.init_events();
    };

    // initialize methods

    this.convert_page_coords = function (pagex, pagey) {
        return [Math.floor(pagex / this_.cell_size),
                Math.floor(pagey / this_.cell_size)];
    };

    this.init_events = function () {
        var event_container = $(this_.canvas).parent();
        event_container.mousedown(function(event) {
                var cell_coords = this_.convert_page_coords(event.pageX, event.pageY);
                this_.draw_mode = true;
                this_.current_draw_cell = cell_coords;
                this_.toggle_cell(cell_coords[0], cell_coords[1]);
                });
        event_container.mousemove(function(event) {
                if (this_.draw_mode) {
                    var cell_coords = this_.convert_page_coords(event.pageX, event.pageY);
                    if (!arrays_eq(cell_coords, this_.current_draw_cell)) {
                        this_.current_draw_cell = cell_coords;
                        this_.toggle_cell(cell_coords[0], cell_coords[1]);
                    }
                }});
        event_container.mouseup(function(event) {
                this_.draw_mode = false;
                });
    };

    this.toggle_cell = function (cellx, celly) {
        //console.log("CURRENT", this_.current[cellx][celly]);
        var current = (this_.current[cellx][celly] == undefined) ?
            0 : this_.current[cellx][celly];
        this_.current[cellx][celly] = (current + 1) % 2;
        //console.log("NEW", this_.current[cellx][celly]);
        if (current) {
            this_.clear_cell(cellx, celly);
        } else {
            //console.log("TOGGLING CELL");
            this_.context.save();
            this_.context.fillStyle = this_.live_color;
            this_.paint_cell(cellx, celly);
            this_.context.restore();
        }
    };

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

    this.clear_cell = function (cellx, celly) {
        this_.context.clearRect(cellx*this_.cell_size,
                celly*this_.cell_size,
                this_.cell_size, this_.cell_size);
    }

    // swap current and successor
    this.swap_buffers = function () {
        this_.current = this_.successor;
        this_.successor = make_empty_grid(this_.grid_width, this_.grid_height);
    }

    // calculate successor from current
    this.next_generation = function () {
        for (var cellx=0; cellx<this_.grid_width; cellx++) {
            for (var celly=0; celly<this_.grid_height; celly++) {
                this_.successor[cellx][celly] = this.decide(
                        parseInt(cellx),
                        parseInt(celly));
            }
        }
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

    this.decide = function (cellx, celly) {
        var live_neighboors = life.count_live_neightboors(cellx, celly);
        var is_live = this_.current[cellx][celly];
        return this_.inner_decide_func(is_live, live_neighboors, 8 - live_neighboors);
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

    this.faster = function () {
        this_.set_interval(this_.redraw_interval/1.3);
        return false;
    }

    this.slower = function () {
        this_.set_interval(this_.redraw_interval*1.3);
        return false;
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
        return false;
    }

    this.start = function () {
        if (!this_.started) {
            this_.timer = setInterval(this_.generation_step,
                    this_.redraw_interval);
            this_.started = true;
        }
        return false;
    }

    this.toggle = function () {
        if (this_.started) {
            return this_.pause();
        } else {
            return this_.start();
        }
    }

    this.inject = function (count) {
        inject_randomness_in_grid(this_.current, this_.grid_width,
                this_.grid_height, count);
        return false;
    }

    this.change_decider_from_st = function (when_to_stay_live_st, when_to_liven_st) {
        my_parseInt = function (x) { return parseInt(x); };
        this_.inner_decide_func = make_decider(
                when_to_stay_live_st.split(" ").map(my_parseInt),
                when_to_liven_st.split(" ").map(my_parseInt));
        return false;
    }

    this.clear = function () {
        this_.current = make_empty_grid(this_.grid_width,
                this_.grid_height);
        clear_canvas(this_.canvas);
        return false;
    }

    this.init();
}
