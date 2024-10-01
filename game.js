import * as THREE from 'three';
import { PointerLockControls } from 'PointerLockControls';
import { EffectComposer, EffectPass, RenderPass, GodRaysEffect } from 'postprocessing';
import TextTools from './TextTools.js';


export class DefaultConfig {
    static CELL_SIZE = 10;
    static WALL_HEIGHT = 5;
    static LABYRINTH_SIZE = 20;
    static WALK_SPEED = 150;
    static RUN_SPEED = 300;
    static JUMP_HEIGHT = 20;
    static GRAVITY = 30;
    static PLAYER_HEIGHT = 2;
    static PLAYER_RADIUS = 1.1;
    static TIME_STEP = 1 / 60;
}

let Config = DefaultConfig

export function setConfig(C){
    Config = C;
}

export class Game {
    constructor(autoStart = true) {
        this.labyrinth_seed_base = 0.1;
        this.labyrinth_seed = this.labyrinth_seed_base;
        this.level = 1;
        this.collisionEnabled = true;
        this.setupScene();
        this.setupPhysics();
        this.labyrinth = new Labyrinth(this);
        this.player = new Player(this);
        this.setupEventListeners();
        this.player.resetPosition();
        
        this._render = this.getPostprocessingRenderer();
        if(autoStart) this.animate();
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    static start(){
        return new this();
    }

    nextLevel(variant = 0){
        this.gotoLevel(this.level + 1, variant);
    }

    gotoLevel(l, variant = 0){
        const B = this.labyrinth_seed_base;
        this.level = l;
        this.labyrinth_seed = B + (10 * this.level) + 1/(variant + 1);
        this.labyrinth.draw();
    }

    render(){
        if(this._render) return this._render();
        this.renderer.render(this.scene, this.camera);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 0, 500);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 0);
        light.position.set(50, 100, 50);
        light.castShadow = true;
        this.scene.add(light);
        this.scene.add(new THREE.AmbientLight(0x404040));

        this.controls = new PointerLockControls(this.camera, document.body);
        this.scene.add(this.controls.getObject());
    }

    setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -Config.GRAVITY, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();

        const groundMaterial = new CANNON.Material('groundMaterial');
        const playerMaterial = new CANNON.Material('playerMaterial');
        const wallMaterial = new CANNON.Material('wallMaterial');

        this.world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, playerMaterial, { friction: 0.8, restitution: 0.3 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(wallMaterial, playerMaterial, { friction: 0.8, restitution: 0.3 }));
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.player.onKeyDown.bind(this.player));
        document.addEventListener('keyup', this.player.onKeyUp.bind(this.player));
        document.addEventListener('click', () => this.controls.lock());
        this.controls.addEventListener('lock', () => document.getElementById('instructions').style.display = 'none');
        this.controls.addEventListener('unlock', () => document.getElementById('instructions').style.display = 'block');
        document.getElementById('generateBtn').addEventListener('click', () => this.labyrinth.draw());
        document.getElementById('saveBtn').addEventListener('click', () => this.labyrinth.save());
        document.getElementById('loadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.labyrinth.load(e));
        document.getElementById('toggleCollisionBtn').addEventListener('click', () => this.toggleCollision());
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const time = performance.now();                                
        const delta = (performance.now() - (this.prevTime || time)) / 1000;
        this.world.step(Config.TIME_STEP);
        this.player.animate(delta, time);
        this.labyrinth.animate(delta, time);
        this.render();
        this.prevTime = performance.now();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    toggleCollision() {
        this.collisionEnabled = !this.collisionEnabled;
        const btn = document.getElementById('toggleCollisionBtn');
        btn.textContent = this.collisionEnabled ? 'Disable Collision' : 'Enable Collision';
        console.log(this.collisionEnabled, btn);
        btn.style.background = this.collisionEnabled ? '#4CAF50' : '#ff4136';
        this.world.bodies.forEach(body => {
            body.collisionResponse = body.lockedCollisions || this.collisionEnabled
        });
    }

    getPostprocessingRenderer() {
        const composer = new EffectComposer(this.renderer);

        // Create a render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        // Collect light meshes from light.userData.mesh
        const lightMeshes = [];

        this.scene.traverse((object) => {
            if (object.isLight && object?.userData?.mesh) {
                lightMeshes.push(object.userData.mesh);
            }
        });

        // Create God Rays effects for each light mesh
        const godRaysEffects = lightMeshes.map((lightMesh) => {
            return new GodRaysEffect(this.camera, lightMesh, {
                resolutionScale: 1.0,
                density: 0.96,
                decay: 1,
                weight: 1,
                samples: 30, // Adjust for performance if needed
                clampMax: 1.0
            });
        });

        // Combine the effects into one EffectPass
        const effectPass = new EffectPass(this.camera, ...godRaysEffects);
        composer.addPass(effectPass);

        return () => composer.render();
    }    
}

class Player {
    constructor(game) {
        this.game = game;
        this.move = { forward: false, backward: false, left: false, right: false, sprint: false };
        this.canJump = false;
        this.direction = new THREE.Vector3();
        const shape = new CANNON.Sphere(Config.PLAYER_RADIUS);
        this.body = new CANNON.Body({
            mass: 5, shape, material: new CANNON.Material('playerMaterial'),
            linearDamping: 0.9, angularDamping: 0.9
        });
        this.body.lockedCollisions = true;
        this.body.position.set(0, Config.PLAYER_HEIGHT, 0);
        this.game.world.addBody(this.body);
    }

    resetPosition() {
        const pos = this.game.labyrinth.getStartPosition();
        this.body.position.set(pos.x, pos.y, pos.z);
        this.body.velocity.set(0, 0, 0);
        this.game.controls.getObject().position.copy(this.body.position);
    }

    animate(delta, time) {
        const { controls, camera } = this.game;
        if (controls.isLocked) {
            this.direction.set(
                Number(this.move.right) - Number(this.move.left),
                0,
                Number(this.move.backward) - Number(this.move.forward)
            ).normalize();
            const speed = this.move.sprint ? Config.RUN_SPEED : Config.WALK_SPEED;
            const velocity = this.direction.clone().applyQuaternion(camera.quaternion).multiplyScalar(speed * delta);
            this.body.applyImpulse(new CANNON.Vec3(velocity.x, 0, velocity.z), this.body.position);
            if (this.canJump) { this.body.velocity.y = Config.JUMP_HEIGHT; this.canJump = false; }
        }
        this.game.controls.getObject().position.copy(this.body.position);
        if (this.body.position.y < Config.PLAYER_HEIGHT) {
            this.body.position.y = Config.PLAYER_HEIGHT; this.body.velocity.y = 0; this.canJump = true;
        }
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': this.move.forward = true; break;
            case 'ArrowLeft': case 'KeyA': this.move.left = true; break;
            case 'ArrowDown': case 'KeyS': this.move.backward = true; break;
            case 'ArrowRight': case 'KeyD': this.move.right = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.move.sprint = true; break;
            case 'Space': if (this.canJump) { this.body.velocity.y += Config.JUMP_HEIGHT; this.canJump = false; } break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': this.move.forward = false; break;
            case 'ArrowLeft': case 'KeyA': this.move.left = false; break;
            case 'ArrowDown': case 'KeyS': this.move.backward = false; break;
            case 'ArrowRight': case 'KeyD': this.move.right = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.move.sprint = false; break;
        }
    }
}

class Labyrinth {
    constructor(game) {
        this.game = game;
        this.orbs = [];
        this.wallBodies = [];
        this.cachedGeometries = {};  // Cache for geometries based on dimensions
        this.wallMaterial = new THREE.MeshPhongMaterial({
            map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/brick_diffuse.jpg')
        });
        this.wallBodies = [];

        this.draw();
    }

    generate(width = Config.LABYRINTH_SIZE, height = Config.LABYRINTH_SIZE) {
        const random = (seed=>{
            let s = seed;
            return function() {
                s = Math.sin(s) * 10000;
                return s - Math.floor(s);
            };
        })(this.game.labyrinth_seed)

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
            start[0] = Math.floor(random() * height)
        } while (start[0] % 2 == 0);
        do {
            start[1] = Math.floor(random() * width)
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
            
            var choice = n[Math.floor(random() * n.length)];
            openCells.push(choice);
            maze[ choice[0] ][ choice[1] ] = 0;
            maze[ (choice[0] + cell[0]) / 2 ][ (choice[1] + cell[1]) / 2 ] = 0;
        }
        
        maze[maze.length - 1][maze[0].length - 2] = 0;
        maze[maze.length - 2][maze[0].length - 2] = 0;
        
        return maze;
    }

    draw(matrix = null) {
        this.matrix = matrix || this.generate();
        this.wallMeshes = new Map();
        this.freeBorders = this.getFreeBorders();

        if (this.group) this.game.scene.remove(this.group);
        this.group = new THREE.Group();
        this.game.scene.add(this.group);
        this.createWalls();
        this.createFloor();
        this.orbs = [
            [this.getStartPosition(), 0xFF0000, 1], 
            ...this.getEndPositions().map(p=>[p, 0x00FF00, 1])
        ].map(([p, color, height])=>this.createOrb(p, color, height));
        
        if(this.game.player){
            this.game.player.resetPosition();
        }
        this.setLabel();
    }

    animate(delta, time){
        this.orbs.forEach(child=>{
            child.position.y = child.userData.initialY + Math.sin(time * 0.003) * 0.5;
        });
        const P = this.game.player.body.position;
        if(!this.finishing){
            const finished = this.getEndPositions().findIndex(({x,z})=>Math.abs(P.x - x) + Math.abs(P.z - z) < Config.CELL_SIZE/5);
            if(finished >= 0){
                // TODO: Animate something while finishing
                setTimeout(() => {
                    this.finishing = false;
                    this.game.nextLevel(finished);
                }, 10);
            } 
        }
    }

    createOrb(pos, color, height = 0) {
        const orbGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const orbMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5});
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);

        // Set orb position based on the cell's column and row
        orb.position.set(pos.x, Config.WALL_HEIGHT / 2 + height * Config.WALL_HEIGHT, pos.z);

        // Create and position the light source at the same place as the orb
        const light = new THREE.PointLight(orbMaterial.color, 1, Config.CELL_SIZE * 10);
        light.castShadow = true;
        light.userData = {mesh: orb};
        orb.add(light);
        
        // Store initial data for later use if necessary
        orb.userData = {
            initialY: orb.position.y,
            light: light,
        };

        this.group.add(orb);
        return orb;
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

    // Method to cache geometries
    getCachedGeometry(width, height, depth) {
        const key = `${width}_${height}_${depth}`;
        if (!this.cachedGeometries[key]) {
            this.cachedGeometries[key] = new THREE.BoxGeometry(width, height, depth);
        }
        return this.cachedGeometries[key];
    }

    // Method to place a wall (invisible or visible)
    placeWall(from, to, height, invisible = false) {
        // Calculate wall dimensions and position
        const width = Math.abs(to[0] - from[0]) * Config.CELL_SIZE || Config.CELL_SIZE;
        const depth = Math.abs(to[1] - from[1]) * Config.CELL_SIZE || Config.CELL_SIZE;
        const x = (from[0] + to[0]) / 2 * Config.CELL_SIZE + Config.CELL_SIZE / 2;
        const z = (from[1] + to[1]) / 2 * Config.CELL_SIZE + Config.CELL_SIZE / 2;

        const sizeX = (from[0] === to[0]) ? Config.CELL_SIZE / 2 : width / 2;
        const sizeZ = (from[1] === to[1]) ? Config.CELL_SIZE / 2 : depth / 2;

        // Create CANNON body for physics
        const shape = new CANNON.Box(new CANNON.Vec3(sizeX, height / 2, sizeZ));
        const body = new CANNON.Body({ mass: 0, shape });
        body.position.set(x, height / 2, z);
        this.game.world.addBody(body);
        this.wallBodies.push(body);

        // If the wall is visible, create or reuse geometry and add it to the scene
        if (!invisible) {
            body.collisionResponse = this.game.collisionEnabled;
            const wallGeo = this.getCachedGeometry(width, height, depth);
            const wall = new THREE.Mesh(wallGeo, this.wallMaterial);
            wall.position.set(x, height / 2, z);
            wall.castShadow = true;
            wall.receiveShadow = true;

            this.wallMeshes[from] = wall;
            this.group.add(wall);
        }else{
            body.lockedCollisions = true;
        }
    }

    // Main method to create all walls
    createWalls() {
        // Clear existing walls
        this.wallBodies.forEach(body => this.game.world.removeBody(body));
        this.wallBodies = [];

        // Create visible maze walls
        for (let i = 0; i < this.matrix.length; i++) {
            for (let j = 0; j < this.matrix[i].length; j++) {
                if (this.matrix[i][j] === 1) {
                    this.placeWall([i, j], [i, j], Config.WALL_HEIGHT);
                }
            }
        }

        // Create invisible boundary walls
        const boundaryWalls = ((W, H)=>[
            [[-1, -1], [-1, W] ],   // Left wall
            [[H, -1], [H, W]],      // Right wall
            [[-1, -1], [H, -1]],    // Top wall
            [[-1, W], [H, W]]       // Bottom wall
        ])(this.matrix[0].length, this.matrix.length);

        boundaryWalls.forEach(([from, to]) => {
            this.placeWall(from, to, Config.WALL_HEIGHT * 5, true);
        });
    }

    createFloor() {
        const floorSizeH = this.matrix.length * Config.CELL_SIZE;
        const floorSizeW = (this.matrix?.[0]?.length??0) * Config.CELL_SIZE;
        const floorGeo = new THREE.PlaneGeometry(floorSizeW, floorSizeH);
        
        // Load and configure the floor texture
        const floorTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(floorSizeW/5, floorSizeH/5);
        
        const floorMat = new THREE.MeshPhongMaterial({ map: floorTexture });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(floorSizeW / 2, 0, floorSizeH / 2);
        floor.receiveShadow = true;
        this.group.add(floor);

        // Create the physics body for the floor
        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0, shape, material: new CANNON.Material('groundMaterial') });
        body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.game.world.addBody(body);
    }

    getStartPosition() {
        const [i,j] = this.freeBorders[0];
        return { x: i * Config.CELL_SIZE + Config.CELL_SIZE / 2, y: Config.PLAYER_HEIGHT, z: j * Config.CELL_SIZE + Config.CELL_SIZE / 2 };
    }

    setLabel(){
        const [i,j] = this.freeBorders[0];
        [[-1, 0],[1,0],[0,-1], [0,1]].find(([x, y])=>{
            if(this.matrix[i+x]?.[j+y]??0){
                const wall = this.wallMeshes[[i+x, j+y]];
                const P = this.getStartPosition();
                TextTools.addTextToCubeFace(wall, this.game.level, 'Level', new THREE.Vector3(P.x, P.y, P.z), Config.CELL_SIZE/4);
                return true;
            }
        });
    }

    getEndPositions(){
        return this.freeBorders.slice(1).map(([i,j])=>{
            return { x: i * Config.CELL_SIZE + Config.CELL_SIZE / 2, z: j * Config.CELL_SIZE + Config.CELL_SIZE / 2 };
        });
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