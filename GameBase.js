import Solver from './Solver.js';
import TextTools from './TextTools.js';


export class DefaultConfig {
    static LABYRINTH_SIZE = 20;
}

let Config = DefaultConfig

export function start(){
}

export function setConfig(C){
    Config = C;
}

export class GameBase {
    labyrinth_seed_base = 0.1;

    constructor([level=1, variant=0] = []) {
        this.gotoLevel(level, variant, false);
        if(location.hashHandler) window.removeEventListener('hashchange', location.hashHandler);
        location.hashHandler = async ()=>{
            if(!location.skipHashChange){
                this.gotoLevel(...await this.constructor.getHashLevel());
            }
            delete location.skipHashChange;
        }
        window.addEventListener('hashchange', location.hashHandler);
    }

    static async getHashLevel(){
        const [level=1, variant=0] = await TextTools.decodeNums(location.hash.substring(1));
        return [level, variant];
    }

    setupScene(){
        this.labyrinth = new LabyrinthBase(this).draw();        
        return this;
    }

    nextLevel(variant = 0){
        this.gotoLevel(this.level + 1, variant);
    }

    gotoLevel(l, variant = 0, doDraw = true){
        const B = this.labyrinth_seed_base;
        this.level = l;
        this.level_variant = variant;
        this.labyrinth_seed = B + (10 * this.level) + 1/(variant + 1);
        this.level_info_ready = TextTools.encodeNums([l, variant]).then(newHash => {
            if(newHash == location.hash.substring(1)) return;
            location.skipHashChange = true;
            location.hash = newHash;
        });
        if(doDraw) {
            this.labyrinth.draw();
            if(this.ppRenderer) {
                this.ppRenderer.reset();
            }
        }    

    }

    static async start(){
        return new this(await this.getHashLevel()).setupScene();
    }
}

export class LabyrinthBase {
    constructor(game) {
        this.game = game;
    }

    generate(width, height) {
        // Resulting size may be different from the requested size
        function neighbors(maze, ic, jc) {
            var final = [];
            for (var i = 0; i < 4; i++) {
                var n = [ic, jc];
                n[i % 2] += ((Math.floor(i / 2) * 2) || -2);
                if (n[0] < maze.length && 
                    n[1] < maze[0].length && 
                    n[0] > 0 && 
                    n[1] > 0) {
                    
                    if (maze[n[0]][n[1]] == 1) {
                        final.push(n);
                    }
                }
            }
            return final;
        }

        width -= width % 2; width++;
        height -= height % 2; height++;
        
        var maze = [];
        for (var i = 0; i < height; i++) {
            maze.push([]);
            for (var j = 0; j < width; j++) {
                maze[i].push(1);
            }
        }
        
        maze[0][1] = 0;
        
        var start = [];
        do {
            start[0] = Math.floor(this.random() * height)
        } while (start[0] % 2 == 0);
        do {
            start[1] = Math.floor(this.random() * width)
        } while (start[1] % 2 == 0);
        
        maze[start[0]][start[1]] = 0;
        var openCells = [start];
        
        while (openCells.length) {
            var cell, n;
            openCells.push([-1, -1]);
            do {
                openCells.pop();
                if (openCells.length == 0)
                    break;
                cell = openCells[openCells.length - 1];
                n = neighbors(maze, cell[0], cell[1]);
            } while (n.length == 0 && openCells.length > 0);
            
            if (openCells.length == 0)
                break;
            
            var choice = n[Math.floor(this.random() * n.length)];
            openCells.push(choice);
            maze[ choice[0] ][ choice[1] ] = 0;
            maze[ (choice[0] + cell[0]) / 2 ][ (choice[1] + cell[1]) / 2 ] = 0;
        }
        
        maze[maze.length - 1][maze[0].length - 2] = 0;
        maze[maze.length - 2][maze[0].length - 2] = 0;
        
        return maze;
    }

    seededRandom(seed){
        let s = seed;
        return function() {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }

    setupMatrix(matrix = null){
        this.random = this.seededRandom(this.game.labyrinth_seed);
        const minSide = 5;
        const maxSide = 40;
        const base = Math.min(minSide + this.game.level, maxSide);
        const cols = minSide + Math.floor((base - minSide)*this.random());
        const rows = Math.max(Math.floor(base * base/cols), minSide);

        this.matrix = matrix || this.generate(cols, rows + this.game.level_variant);
        this.freeBorders = this.getFreeBorders();
    }

    getFreeBorders(){
        const freeBorders = [];
        for (let i = 0; i < this.matrix.length; i++) {
            for (let j = 0; j < this.matrix[i].length; j++) {
                if(i > 0 && j > 0 && i < this.matrix.length - 1 && j < this.matrix[i].length -1 ) continue;
                if(![0, this.matrix.length-1].includes(i)) continue;
                if (this.matrix[i][j] === 0) {
                    freeBorders.push([i,j]);
                }
            }
        }
        return freeBorders;
    }    

    updateHTML(){
        (this.game.level_info_ready || (async ()=>1)()).then(async ()=>{
            const L = this.game.level;
            const childLinks = await Promise.all(TextTools.childNums(L, 0).map(
                ([l, i]) => TextTools.encodeNums([l, this.game.level_variant]).then(hash => {
                    const title = TextTools.encodedToTitle(hash);
                    const short = TextTools.encodedToTitle(hash.split('-').pop());
                    return `<a class="button" title="${title}" href="#${hash}">${short}<sup>&gt;${i}</sup></a>`;
                })
            )).then(links=>links.join('\n'));

            const closeLinks = await Promise.all(TextTools.closeNums(L, 0).map(
                l => TextTools.encodeNums([l, this.game.level_variant]).then(hash => {
                    const title = TextTools.encodedToTitle(hash);
                    const short = TextTools.encodedToTitle(hash.split('-').pop());
                    const active = hash == location.hash.substring(1)?'active':'';
                    return `<a class="button ${active}" title="${title}" href="#${hash}">${short}${l!=L?`<sup>${l - L}</sup>`:''}</a>`;
                })
            )).then(links=>links.join('\n'));

            const parentLinks = await Promise.all(TextTools.parentNums(L, 0).map(
                (l, i) => TextTools.encodeNums([l, this.game.level_variant]).then(hash => {
                    const title = TextTools.encodedToTitle(hash);
                    const short = TextTools.encodedToTitle(hash.split('-').pop());
                    return `<a class="button" title="${title}" href="#${hash}">${short}<sup><${i+1}</sup></a>`;
                })
            ));

            const [blocks, instructions] = Solver.findSolution(
                this.matrix,
                this.freeBorders[0].toReversed(),
                this.freeBorders[1].toReversed(),
                this.game.labyrinth_seed,
                'N'
            );

            const desc = document.querySelector('meta[name="description"]');
            const W = this.matrix[0].length;
            const H = this.matrix.length;
            const page_title = TextTools.encodedToTitle(location.hash.substring(1));
            const size = W*H > 40*40 * 0.2 ? (
                W*H > 40*40 * 0.6 ? 'large' : 'medium'
            ):'small';


            desc.setAttribute('content', `Immersive 3D adventure through an intricate ${size} size maze of ${W}x${H} with ${instructions.length} clues based on the position of cities around the world. Can you find the exit before time runs out?`)
            
            window.base_title = window.base_title || document.title;
            document.title =  page_title + " - " + window.base_title;
            document.querySelector('#level').innerHTML = [this.game.level, this.game.level_variant].join('-');
            document.querySelector('#hash').innerHTML = page_title;
            //document.querySelector('#menu').innerHTML = closeLinks;
            
            document.querySelector('#steps').innerHTML = `
                <p><b>Explore Around</b>${closeLinks}</p>
                ${ blocks.map(t=>`<p>${t}.</p>`).join('\n') }
                <p><b>Go Deeper</b>${childLinks}</p>
                ${parentLinks.length ? `<p><b>Go Up</b>${parentLinks.join('\n')}</p>` : ''}
            `.trim();
            document.body.setAttribute('ready',1);
        })
    }

    draw(matrix = null) {
        this.setupMatrix(matrix);
        this.updateHTML();
        return this;
    }

    save() {
        const blob = new Blob([JSON.stringify(this.matrix)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'labyrinth.json'; a.click();
        URL.revokeObjectURL(url);
    }

    load(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const matrix = JSON.parse(e.target.result);
                this.draw(matrix);
            };
            reader.readAsText(file);
        }
    }
}