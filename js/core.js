import { Clock, Box3, Vector3, DirectionalLight, HemisphereLight, AmbientLight,
        PCFSoftShadowMap, PerspectiveCamera, Scene, WebGLRenderer, Color,
        Float32BufferAttribute, BufferGeometry, PointsMaterial, Points} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Board } from './board.js';
import { ModelManager } from './model.js';
import { GameLogic } from './gamelogic.js';
import { ScoreManager } from './score.js';
import * as TWEEN from '@tweenjs/tween.js';
import { SoundManager } from './soundManager.js';
import { TileHolder } from './tileHolder.js';
import { GameStarter } from './gameStarter.js';
import { GameTimer } from './gameTimer.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import data from "../assets/decorations/decors.json" assert { type: "json"}


export class Core {
    renderer;
    scene;
    camera;
    control;
    clock;

    scoreUI
    highscoreUI
    scoreMgr;
    model;
    board;
    gameLogic;
    soundMgr;
    tileHolder;
    gameStarter;
    gameTime;
    timerUI
    gameTimer;
    texturePath;

    snowParticles;
    snowParticleSystem;

    constructor(onReady, scoreUI, highscoreUI, timerUI, gameTime, texturePath) {
        this.clock = new Clock();
        this.scoreUI = scoreUI
        this.highscoreUI = highscoreUI
        this.timerUI = timerUI
        this.gameTime = gameTime
        this.texturePath = texturePath

        // renderer section
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // scene section
        this.scene = new Scene();

        this.scene.background = new Color("#87CEEB");

        const ambientLight = new AmbientLight(0xffffff, 3);
        this.scene.add(ambientLight);

        const hemiLight = new HemisphereLight(0xffffff, 0xffffff, 5);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);
        
        const dirLight = new DirectionalLight(0xff0000, 4.5);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(1, 1.2, -1);
        dirLight.position.multiplyScalar(500);
        this.scene.add(dirLight);

        const shadowMapDist = 150;
        const solution = 2048;
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = solution;
        dirLight.shadow.mapSize.height = solution;
        dirLight.shadow.camera.left = -shadowMapDist;
        dirLight.shadow.camera.right = shadowMapDist;
        dirLight.shadow.camera.top = shadowMapDist;
        dirLight.shadow.camera.bottom = -shadowMapDist;
        dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = -0.00001;
        
        this.camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 1000);
        this.camera.position.set(0, 50, -50);
        this.camera.lookAt(0, 0, 0);

        this.control = new OrbitControls(this.camera, this.renderer.domElement);
        this.control.enableDamping = true;
        this.control.dampingFactor = 0.05;
        this.control.enableKeys = false;
        this.control.screenSpacePanning = false;
        this.control.rotateSpeed = 0.5;
        this.control.enablePan = false;
        this.control.minPolarAngle = Math.PI * 0.1;
        this.control.maxPolarAngle = Math.PI * 0.5;
        
        this.control.autoRotate = true;
        this.control.enabled = false;

        window.addEventListener('resize', this.onResize.bind(this), false);

        const scope = this;
        this.model = new ModelManager(this.scene, function(){
            scope.gameTimer = new GameTimer(scope.scene, scope.camera, scope.control, scope.gameTime, scope.timerUI);
            scope.soundMgr = new SoundManager(scope.camera);
            scope.scoreMgr = new ScoreManager(scope.scene, scope.camera, scope.control, scope.scoreUI, scope.highscoreUI);
            scope.board = new Board(scope.scene, scope.model, scope.camera, scope.control, 
                scope.scoreMgr, scope.soundMgr, scope.gameTimer, scope.texturePath);
            scope.gameLogic = new GameLogic(scope.scene, scope.camera, scope.control, scope.board, scope.model, scope.scoreMgr, scope.soundMgr, scope.gameTimer);
            scope.tileHolder = new TileHolder(scope.scene, scope.camera, scope.control, scope.model);
            scope.gameLogic.setTileHolder(scope.tileHolder);
            scope.board.setTileHolder(scope.tileHolder);

            scope.tileHolder.setVisible(false);
            scope.gameTimer.setGameLogic(scope.gameLogic);

            scope.gameStarter = new GameStarter(scope.scene, scope.camera, scope.control, () => {
                scope.control.autoRotate = false;
                scope.control.enabled = true;
                scope.tileHolder.setVisible(true);
                scope.gameTimer.isPlaying = true;
                scope.soundMgr.playSound('BGM');
                scope.gameLogic.createCursor();
                scope.gameLogic.enable();
            });
            scope.board.setGameStarter(scope.gameStarter);

            scope.loadAircraftModel();
            scope.loadBugatti1Model();
            scope.loadBugatti2Model();
            scope.loadBugatti3Model();
            data.decors.forEach(decor => {
                scope.loadDecors(decor)
            })
            scope.createSnow()

            // if(scope.aircraft) {
            //     scope.createAircraftAnimation()
            // }

            if (onReady) {
                onReady();
            }

            scope.render();
        });
    }

    createSnow() {
        const particleCount = 70000;
        const particles = new BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * 300 - 100;
            const y = Math.random() * 200 - 50;
            const z = Math.random() * 300 - 100;
            positions.push(x, y, z);
            velocities.push(0, -Math.random() * 0.5, 0); // Falling speed
        }

        particles.setAttribute('position', new Float32BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new Float32BufferAttribute(velocities, 3));

        const particleMaterial = new PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });

        this.snowParticleSystem = new Points(particles, particleMaterial);
        this.scene.add(this.snowParticleSystem);
    }

    updateSnow() {
        const positions = this.snowParticleSystem.geometry.attributes.position.array;
        const velocities = this.snowParticleSystem.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i]; 
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2]; 

            if (positions[i + 1] < -50) {
                positions[i + 1] = 50;
            }
        }

        this.snowParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    getObjectMaxSize(object) {
        const box = new Box3().setFromObject(object);
        const size = box.getSize(new Vector3());
        const maxSize = Math.max(size.x, size.y, size.y);
        return maxSize
    }

    loadAircraftModel() {
        const scope = this;
    
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
            'assets/models/aircraft/plane.mtl', 
            function(materials) {
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load(
                    'assets/models/aircraft/plane.obj', 
                    function(object) {
                        object.position.set(5, 40, 50);
                        object.rotation.set(0, 29.8, 0);
                        //
                        const maxSize = scope.getObjectMaxSize(object)
                        const desizedSize = 15;
                        object.scale.multiplyScalar(desizedSize / maxSize);
                        //
                        scope.scene.add(object);
                        scope.aircraft = object; 

                        scope.createAircraftAnimation();
                    },
                    function(xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    function(error) {
                        console.error('Error loading aircraft model:', error);
                    }
                );
            },
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(error) {
                console.error('Error loading plane materials:', error);
            }
        );
    }

    createAircraftAnimation() {
        const scope = this;
        const positionStart = { x: 5, y: 40, z: 50 };
        const positionEnd = { x: 100, y: 40, z: 50 };
    
        const moveTween = new TWEEN.Tween(positionStart)
            .to(positionEnd, 40000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.aircraft) {
                    scope.aircraft.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotation = { y: (270) * Math.PI / 180 };
        
        const rotateTween = new TWEEN.Tween(rotation)
            .to({ y: (30+60) * Math.PI / 180 }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.aircraft) {
                    scope.aircraft.rotation.y = rotation.y;
                }
            });
    
        const moveBackTween = new TWEEN.Tween(positionStart)
            .to({ x: 5, y: 40, z: 50 }, 30000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.aircraft) {
                    scope.aircraft.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotateBackTween = new TWEEN.Tween(rotation)
            .to({ y: (-90) * Math.PI / 180 }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.aircraft) {
                    scope.aircraft.rotation.y = rotation.y;
                }
            })
            .onComplete(() => {
                scope.createAircraftAnimation();
            });
    
        moveTween.chain(rotateTween);
        rotateTween.chain(moveBackTween);
        moveBackTween.chain(rotateBackTween);
        
        moveTween.start();
    }
    
    loadBugatti1Model() {
        const scope = this;
    
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
            'assets/models/bugatti/bugatti.mtl', 
            function(materials) {
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load(
                    'assets/models/bugatti/bugatti.obj', 
                    function(object) {
                        object.position.set(94, 0.29, 5);
                        object.rotation.set(0, 4.72, 0);
                        //
                        const box = new Box3().setFromObject(object);
                        const size = box.getSize(new Vector3());
                        const maxSize = Math.max(size.x, size.y,size.y);
                        const desizedSize = 2;
                        object.scale.multiplyScalar(desizedSize/maxSize);
                        //
                        scope.scene.add(object);
                        scope.bugatti1 = object; 

                        scope.createBugatti1Animation();
                    },
                    function(xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    function(error) {
                        console.error('Error loading aircraft model:', error);
                    }
                );
            },
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(error) {
                console.error('Error loading plane materials:', error);
            }
        );
    }

    createBugatti1Animation() {
        const scope = this;
        const positionStart = { x: 94, y: 0.29, z: 5 };
        const positionEnd = { x: -3, y: 0.29, z: 5 };
    
        const moveTween = new TWEEN.Tween(positionStart)
            .to(positionEnd,20000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti1) {
                    scope.bugatti1.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotation = { y: (270) * Math.PI / 180 };
        
        const rotateTween = new TWEEN.Tween(rotation)
            .to({ y: (90) * Math.PI / 180 }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti1) {
                    scope.bugatti1.rotation.y = rotation.y;
                }
            });
    
        const moveBackTween = new TWEEN.Tween(positionStart)
            .to({ x: 94, y: 0.29, z: 5 }, 10000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti1) {
                    scope.bugatti1.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotateBackTween = new TWEEN.Tween(rotation)
            .to({ y: (-90) * Math.PI / 180 }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti1) {
                    scope.bugatti1.rotation.y = rotation.y;
                }
            })
            .onComplete(() => {
                scope.createBugatti1Animation();
            });
    
        moveTween.chain(rotateTween);
        rotateTween.chain(moveBackTween);
        moveBackTween.chain(rotateBackTween);
        
        moveTween.start();
    }

    loadBugatti2Model() {
        const scope = this;
    
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
            'assets/models/bugatti/bugatti.mtl', 
            function(materials) {
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load(
                    'assets/models/bugatti/bugatti.obj', 
                    function(object) {
                        object.position.set(-3, 0.29, 45);
                        object.rotation.set(0, -4.72, 0);
                        //
                        const box = new Box3().setFromObject(object);
                        const size = box.getSize(new Vector3());
                        const maxSize = Math.max(size.x, size.y,size.y);
                        const desizedSize = 2;
                        object.scale.multiplyScalar(desizedSize/maxSize);
                        //
                        scope.scene.add(object);
                        scope.bugatti2 = object; 

                        scope.createBugatti2Animation();
                    },
                    function(xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    function(error) {
                        console.error('Error loading aircraft model:', error);
                    }
                );
            },
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(error) {
                console.error('Error loading plane materials:', error);
            }
        );
    }

    createBugatti2Animation() {
        const scope = this;
        const positionStart = { x: -3, y: 0.29, z: 65 };
        const positionEnd = { x: 94, y: 0.29, z: 65 };
    
        const moveTween = new TWEEN.Tween(positionStart)
            .to(positionEnd,15000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti2) {
                    scope.bugatti2.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotation = { y: (-270) * Math.PI / 180 };
        
        const rotateTween = new TWEEN.Tween(rotation)
            .to({ y: (-90) * Math.PI / 180 }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti2) {
                    scope.bugatti2.rotation.y = rotation.y;
                }
            });
    
        const moveBackTween = new TWEEN.Tween(positionStart)
            .to({ x: -3, y: 0.29, z: 65 }, 12000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti2) {
                    scope.bugatti2.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotateBackTween = new TWEEN.Tween(rotation)
            .to({ y: (90) * Math.PI / 180 }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti2) {
                    scope.bugatti2.rotation.y = rotation.y;
                }
            })
            .onComplete(() => {
                scope.createBugatti2Animation();
            });
    
        moveTween.chain(rotateTween);
        rotateTween.chain(moveBackTween);
        moveBackTween.chain(rotateBackTween);
        
        moveTween.start();
    }

    loadBugatti3Model() {
        const scope = this;
    
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
            'assets/models/bugatti/bugatti.mtl', 
            function(materials) {
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load(
                    'assets/models/bugatti/bugatti.obj', 
                    function(object) {
                        object.position.set(45, 0.29, -3.5);
                        object.rotation.set(0, 0, 0);
                        //
                        const box = new Box3().setFromObject(object);
                        const size = box.getSize(new Vector3());
                        const maxSize = Math.max(size.x, size.y,size.y);
                        const desizedSize = 1;
                        object.scale.multiplyScalar(desizedSize/maxSize);
                        //
                        scope.scene.add(object);
                        scope.bugatti3 = object; 

                        scope.createBugatti3Animation();
                    },
                    function(xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    function(error) {
                        console.error('Error loading aircraft model:', error);
                    }
                );
            },
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(error) {
                console.error('Error loading plane materials:', error);
            }
        );
    }

    createBugatti3Animation() {
        const scope = this;
        const positionStart = { x: 45, y: 0.29, z: -3.5 }; //45, 0.29, -3.5
        const positionEnd = { x: 45, y: 0.29, z: 94 };
    
        const moveTween = new TWEEN.Tween(positionStart)
            .to(positionEnd,20000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti3) {
                    scope.bugatti3.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotation = { y: (0) * Math.PI / 180 };
        
        const rotateTween = new TWEEN.Tween(rotation)
            .to({ y: (180) * Math.PI / 180 }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti3) {
                    scope.bugatti3.rotation.y = rotation.y;
                }
            });
    
        const moveBackTween = new TWEEN.Tween(positionStart)
            .to({ x: 45, y: 0.29, z: -3.5 }, 20000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti3) {
                    scope.bugatti3.position.set(positionStart.x, positionStart.y, positionStart.z);
                }
            });
    
        const rotateBackTween = new TWEEN.Tween(rotation)
            .to({ y: (0) * Math.PI / 180 }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                if (scope.bugatti3) {
                    scope.bugatti3.rotation.y = rotation.y;
                }
            })
            .onComplete(() => {
                scope.createBugatti3Animation();
            });
    
        moveTween.chain(rotateTween);
        rotateTween.chain(moveBackTween);
        moveBackTween.chain(rotateBackTween);
        
        moveTween.start();
    }

    loadDecors(inform) {
        const scope = this;

        const path = inform.path
        const name = inform.name
        const mtl_path = path + name + ".mtl"
        const obj_path = path + name + ".obj"
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
            mtl_path, 
            function(materials) {
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load(
                    obj_path, 
                    function(object) {
                        const maxSize = scope.getObjectMaxSize(object);

                        inform.instance_spec.forEach(spec => {
                            const clone_obj = object.clone()

                            const pos = spec.initPosition
                            const rot = spec.initAngle
                            clone_obj.position.set(pos[0], pos[1], pos[2]);
                            clone_obj.rotation.set(rot[0], rot[1], rot[2]);
                            
                            clone_obj.scale.multiplyScalar(inform.desize / maxSize);
                            
                            scope.scene.add(clone_obj);
                        });
                    }
                );
            }
        );
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        requestAnimationFrame(this.render.bind(this));

        const deltaTime = this.clock.getDelta();
        TWEEN.update();
        this.gameStarter.update(deltaTime);
        this.tileHolder.update(deltaTime);
        this.scoreMgr.update(deltaTime);
        this.board.update(deltaTime);
        this.gameTimer.update(deltaTime);
        this.control.update();
        this.updateSnow()
        
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.board.dispose();
        this.gameLogic.disposeCursor();
    }

    createGame(mapWidth, mapHeight) {
        this.dispose();
        this.board.createMap(mapWidth, mapHeight);
    }
}
