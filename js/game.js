/**
 * ZOMBIE APOCALYPSE - WWZ AFTERMATH GAME ENGINE
 * Core 3D engine, level geometry, player controller (1st/3rd person toggle), wave director, and UI controller.
 */

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();

        // Game State
        this.state = 'menu'; // 'menu', 'playing', 'paused', 'gameover', 'victory'
        this.cameraMode = 'first'; // 'first' or 'third'

        // Player Stats
        this.player = {
            position: new THREE.Vector3(0, 4.2, -3.0),
            velocity: new THREE.Vector3(),
            rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            health: 100,
            maxHealth: 100,
            armor: 50,
            maxArmor: 50,
            stamina: 100,
            maxStamina: 100,
            isSprinting: false,
            isMoving: false,
            speed: 5.5,
            sprintSpeed: 9.2,
            staminaDrain: 25,
            staminaRegen: 20,
            mesh: null,
            cameraRecoil: new THREE.Vector2(),
            takeDamage: (amount, type) => this.playerTakeDamage(amount, type),
            addCameraRecoil: (pitch, yaw) => {
                this.player.cameraRecoil.x += pitch;
                this.player.cameraRecoil.y += yaw;
            }
        };

        // Score & Wave Stats
        this.stats = {
            score: 0,
            kills: 0,
            headshots: 0,
            wavesCleared: 0,
            combo: 0,
            lastKillTime: 0
        };

        this.currentWave = 0;
        this.waveState = 'prep'; // 'prep', 'warning', 'combat'
        this.waveTimer = 0;
        this.threatLevel = 'CALM';

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, isDown: false, isRightDown: false };
        this.mouseSensitivity = 0.0022;

        this.initThree();
        this.initEnvironment();
        this.initPlayer();
        this.initSubsystems();
        this.initInputs();
        this.initUI();

        // Resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Start render loop
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080b); // dark apocalyptic midnight
        this.scene.fog = new THREE.FogExp2(0x06080b, 0.022); // gritty volumetric distance fog

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
    }

    initEnvironment() {
        // --- LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0x1a2233, 0.85); // cold blue night tint
        this.scene.add(ambientLight);

        // Main moonlight / industrial floodlight
        const moonLight = new THREE.DirectionalLight(0x406088, 1.2);
        moonLight.position.set(20, 45, 10);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 1024;
        moonLight.shadow.mapSize.height = 1024;
        this.scene.add(moonLight);

        // Red emergency beacon on catwalk
        const beaconLight = new THREE.PointLight(0xff1100, 2.0, 25);
        beaconLight.position.set(0, 7.0, -8.0);
        this.scene.add(beaconLight);
        this.beaconLight = beaconLight;

        // Sweeping Searchlights (WWZ atmospheric defense spotlights)
        this.searchlights = [];
        const sl1 = this.createSearchlight(-12, 6, -8, 0xffeeaa);
        const sl2 = this.createSearchlight(12, 6, -8, 0xffeeaa);
        this.searchlights.push(sl1, sl2);

        // --- LEVEL GEOMETRY ---
        // 1. Ground Courtyard / Swarm Plaza (y = 0)
        const groundGeo = new THREE.PlaneGeometry(120, 120);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x181c18, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 2. Elevated Fortified Catwalk (y = 4.2)
        // Width: 32m, Depth: 8m, Height: 4.2m
        const catwalkGeo = new THREE.BoxGeometry(32, 0.4, 8);
        const catwalkMat = new THREE.MeshStandardMaterial({ color: 0x2d3238, roughness: 0.6, metalness: 0.5 });
        const catwalk = new THREE.Mesh(catwalkGeo, catwalkMat);
        catwalk.position.set(0, 4.0, -4.0);
        catwalk.receiveShadow = true;
        this.scene.add(catwalk);

        // Catwalk Front Defense Wall (where zombies climb and form pyramids!)
        const wallGeo = new THREE.BoxGeometry(32, 4.2, 0.8);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.8 });
        const frontWall = new THREE.Mesh(wallGeo, wallMat);
        frontWall.position.set(0, 2.1, -8.0);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        this.scene.add(frontWall);

        // Catwalk Parapet / Guard Railing
        const railGeo = new THREE.BoxGeometry(32, 1.0, 0.2);
        const railMat = new THREE.MeshStandardMaterial({ color: 0xcc8800, roughness: 0.4 }); // hazard yellow
        const frontRailing = new THREE.Mesh(railGeo, railMat);
        frontRailing.position.set(0, 4.7, -7.9);
        this.scene.add(frontRailing);

        // Sandbags along the catwalk railing
        for (let x = -14; x <= 14; x += 1.8) {
            const bagGeo = new THREE.BoxGeometry(1.5, 0.5, 0.6);
            const bagMat = new THREE.MeshStandardMaterial({ color: 0x5a503a, roughness: 0.9 });
            const bag = new THREE.Mesh(bagGeo, bagMat);
            bag.position.set(x, 4.45, -7.7);
            this.scene.add(bag);
        }

        // Surrounding Concrete Perimeter Walls
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 1), wallMat);
        backWall.position.set(0, 5, 0.2);
        this.scene.add(backWall);

        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 8), wallMat);
        leftWall.position.set(-16, 5, -4);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 8), wallMat);
        rightWall.position.set(16, 5, -4);
        this.scene.add(leftWall, rightWall);

        // Far breach tunnels where hordes pour in (Z = -50)
        this.createBreachTunnel(-18, -48);
        this.createBreachTunnel(18, -48);

        // Abandoned Military Truck in the Courtyard
        this.createMilitaryTruck(new THREE.Vector3(-4, 0, -25), 0.3);
    }

    createSearchlight(x, y, z, color) {
        const spotLight = new THREE.SpotLight(color, 4.0, 60, Math.PI / 6, 0.4, 1.2);
        spotLight.position.set(x, y, z);
        const target = new THREE.Object3D();
        target.position.set(x, 0, -28);
        this.scene.add(target);
        spotLight.target = target;
        this.scene.add(spotLight);
        return { light: spotLight, target: target, baseAngle: x > 0 ? 0.4 : -0.4 };
    }

    createBreachTunnel(x, z) {
        const group = new THREE.Group();
        const archGeo = new THREE.BoxGeometry(10, 7, 6);
        const archMat = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.9 });
        const tunnel = new THREE.Mesh(archGeo, archMat);
        tunnel.position.set(0, 3.5, 0);

        // Red warning strobe above tunnel
        const strobe = new THREE.PointLight(0xff2200, 3.0, 18);
        strobe.position.set(0, 6.5, 3.2);

        group.add(tunnel, strobe);
        group.position.set(x, 0, z);
        this.scene.add(group);
    }

    createMilitaryTruck(pos, angle) {
        const group = new THREE.Group();
        const truckMat = new THREE.MeshStandardMaterial({ color: 0x2e3528, roughness: 0.7 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

        // Cabin & Bed
        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 3.2), truckMat);
        cab.position.set(0, 1.8, 2.5);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.6, 6.0), truckMat);
        bed.position.set(0, 2.0, -2.0);

        // Wheels
        for (let z of [-3.5, -1.0, 2.5]) {
            for (let x of [-1.6, 1.6]) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0.55, z);
                group.add(wheel);
            }
        }

        group.add(cab, bed);
        group.position.copy(pos);
        group.rotation.y = angle;
        this.scene.add(group);
    }

    initPlayer() {
        // Player Character 3D Model for Third-Person Mode
        const playerGroup = new THREE.Group();

        const uniformMat = new THREE.MeshStandardMaterial({ color: 0x3d4538, roughness: 0.6 }); // tactical BDU
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89d7c, roughness: 0.8 });
        const vestMat = new THREE.MeshStandardMaterial({ color: 0x222421, roughness: 0.5, metalness: 0.4 }); // body armor

        // Torso & Body Armor
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), uniformMat);
        torso.position.y = 1.05;
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.6, 0.36), vestMat);
        vest.position.y = 1.1;

        // Head & Helmet
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
        head.position.y = 1.62;
        const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.42), vestMat);
        helmet.position.y = 1.68;

        // Limbs
        const armGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);
        const leftArm = new THREE.Mesh(armGeo, uniformMat);
        leftArm.position.set(-0.35, 1.05, 0);
        const rightArm = new THREE.Mesh(armGeo, uniformMat);
        rightArm.position.set(0.35, 1.05, 0);

        const legGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const leftLeg = new THREE.Mesh(legGeo, uniformMat);
        leftLeg.position.set(-0.16, 0.4, 0);
        const rightLeg = new THREE.Mesh(legGeo, uniformMat);
        rightLeg.position.set(0.16, 0.4, 0);

        playerGroup.add(torso, vest, head, helmet, leftArm, rightArm, leftLeg, rightLeg);
        playerGroup.position.copy(this.player.position);
        this.scene.add(playerGroup);

        this.player.mesh = playerGroup;
        this.player.mesh.visible = (this.cameraMode === 'third');
    }

    initSubsystems() {
        this.particleSystem = new ParticleSystem(this.scene);
        this.zombiesManager = new ZombiesManager(this.scene, { minX: -15, maxX: 15, minZ: -7.5, maxZ: -0.5, height: 4.2 });
        this.defensesManager = new DefensesManager(this.scene);
        this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.player);

        window.game = this; // global link
    }

    initInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Audio init on first user interaction
            if (window.soundEngine && !window.soundEngine.initialized) {
                window.soundEngine.init();
            }

            if (this.state === 'menu') {
                if (e.code === 'Enter' || e.code === 'Space') {
                    this.startGame();
                }
                return;
            }

            // Toggle Camera Mode: 'V' key (WWZ Aftermath signature feature!)
            if (e.code === 'KeyV') {
                this.toggleCameraMode();
            }

            // Reload
            if (e.code === 'KeyR') {
                this.weaponSystem.reload();
            }

            // Weapon switching: 1, 2, 3, 4
            if (e.code === 'Digit1') this.weaponSystem.switchWeapon(0);
            if (e.code === 'Digit2') this.weaponSystem.switchWeapon(1);
            if (e.code === 'Digit3') this.weaponSystem.switchWeapon(2);
            if (e.code === 'Digit4') this.weaponSystem.switchWeapon(3);

            // Melee strike: 'F' key
            if (e.code === 'KeyF') {
                this.performMeleeAttack();
            }

            // Interact: 'E' key (resupply at crate)
            if (e.code === 'KeyE') {
                this.performInteraction();
            }

            // Pause: 'Escape' or 'KeyP'
            if (e.code === 'Escape' || e.code === 'KeyP') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Pointer Lock & Mouse Look
        this.container.addEventListener('click', () => {
            if (this.state === 'playing') {
                this.container.requestPointerLock();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container && this.state === 'playing') {
                this.player.rotation.y -= e.movementX * this.mouseSensitivity;
                this.player.rotation.x -= e.movementY * this.mouseSensitivity;

                // Clamp pitch
                this.player.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.player.rotation.x));
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (window.soundEngine && !window.soundEngine.initialized) {
                window.soundEngine.init();
            }

            if (e.button === 0) {
                this.mouse.isDown = true;
                if (this.state === 'playing') {
                    this.handleFireWeapon();
                }
            } else if (e.button === 2) {
                this.mouse.isRightDown = true;
                this.weaponSystem.setAiming(true);
            } else if (e.button === 1) {
                // Middle click melee
                this.performMeleeAttack();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.isDown = false;
            if (e.button === 2) {
                this.mouse.isRightDown = false;
                this.weaponSystem.setAiming(false);
            }
        });

        // Prevent right click context menu
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse Wheel weapon cycle
        window.addEventListener('wheel', (e) => {
            if (this.state === 'playing') {
                if (e.deltaY > 0) this.weaponSystem.nextWeapon();
                else this.weaponSystem.prevWeapon();
            }
        });
    }

    initUI() {
        this.ui = {
            hud: document.getElementById('hud'),
            healthBar: document.getElementById('health-fill'),
            armorBar: document.getElementById('armor-fill'),
            staminaBar: document.getElementById('stamina-fill'),
            healthText: document.getElementById('health-text'),
            currentMagText: document.getElementById('current-mag'),
            reserveAmmoText: document.getElementById('reserve-ammo'),
            weaponNameText: document.getElementById('weapon-name'),
            weaponTierText: document.getElementById('weapon-tier'),
            waveNumberText: document.getElementById('wave-number'),
            threatText: document.getElementById('threat-level'),
            enemiesLeftText: document.getElementById('enemies-left'),
            scoreText: document.getElementById('score-val'),
            killsText: document.getElementById('kills-val'),
            headshotsText: document.getElementById('headshots-val'),
            cameraModeText: document.getElementById('camera-mode-badge'),
            hitmarker: document.getElementById('hitmarker'),
            headshotSkull: document.getElementById('headshot-skull'),
            waveBanner: document.getElementById('wave-banner'),
            waveBannerTitle: document.getElementById('wave-banner-title'),
            waveBannerSub: document.getElementById('wave-banner-sub'),
            interactPrompt: document.getElementById('interact-prompt'),
            damageVignette: document.getElementById('damage-vignette'),
            startScreen: document.getElementById('start-screen'),
            pauseScreen: document.getElementById('pause-screen'),
            gameOverScreen: document.getElementById('game-over-screen')
        };
    }

    startGame() {
        this.state = 'playing';
        if (this.ui.startScreen) this.ui.startScreen.style.display = 'none';
        if (this.ui.hud) this.ui.hud.style.display = 'block';

        this.container.requestPointerLock();
        if (window.soundEngine) {
            window.soundEngine.init();
            window.soundEngine.resume();
            window.soundEngine.setMusicIntensity(0);
        }

        // Start Wave 1
        this.startNextWave();
    }

    startNextWave() {
        this.currentWave++;
        this.waveState = 'combat';

        let count = 15;
        let bannerTitle = `WAVE ${this.currentWave}: SCOUT BREACH`;
        let bannerSub = "Small clusters of Zekes approaching. Secure the perimeter!";
        let specials = { bull: 0, screamer: 0, gasbag: 0, bomber: 0 };

        if (this.currentWave === 2) {
            count = 32;
            bannerTitle = "WAVE 2: OUTPOST SIEGE";
            bannerSub = "Heavy numbers converging on Sector 4! Watch the fence lines.";
            specials = { bull: 0.04, screamer: 0, gasbag: 0.05, bomber: 0.04 };
        } else if (this.currentWave === 3) {
            count = 65;
            bannerTitle = "WAVE 3: THE SWARM INCOMING!";
            bannerSub = "MASSIVE HORDE DETECTED! Shoot the climbing pyramids before they scale the wall!";
            specials = { bull: 0.06, screamer: 0, gasbag: 0.08, bomber: 0.06 };
        } else if (this.currentWave === 4) {
            count = 90;
            bannerTitle = "WAVE 4: SPECIAL MUTATION";
            bannerSub = "Armored Bulls & Gasbags spotted in the swarm! Aim for headshots!";
            specials = { bull: 0.12, screamer: 0.04, gasbag: 0.12, bomber: 0.08 };
        } else if (this.currentWave >= 5) {
            count = 120 + (this.currentWave - 5) * 25;
            bannerTitle = `WAVE ${this.currentWave}: APOCALYPSE HORDE`;
            bannerSub = "THE SCREAMER IS SUMMONING INFINITE SWARMS! ELIMINATE IT AT ONCE!";
            specials = { bull: 0.12, screamer: 0.06, gasbag: 0.14, bomber: 0.10 };
        }

        this.showWaveBanner(bannerTitle, bannerSub);
        this.zombiesManager.spawnHordeWave(count, specials);
    }

    showWaveBanner(title, sub) {
        if (!this.ui.waveBanner) return;
        this.ui.waveBannerTitle.innerText = title;
        this.ui.waveBannerSub.innerText = sub;
        this.ui.waveBanner.classList.add('banner-active');

        setTimeout(() => {
            if (this.ui.waveBanner) this.ui.waveBanner.classList.remove('banner-active');
        }, 4500);
    }

    toggleCameraMode() {
        this.cameraMode = (this.cameraMode === 'first') ? 'third' : 'first';
        this.player.mesh.visible = (this.cameraMode === 'third');
        this.weaponSystem.fpsWeaponGroup.visible = (this.cameraMode === 'first');
        if (this.ui.cameraModeText) {
            this.ui.cameraModeText.innerText = (this.cameraMode === 'first') ? '1ST PERSON' : '3RD PERSON';
        }
    }

    handleFireWeapon() {
        const result = this.weaponSystem.shoot(this.raycaster, this.zombiesManager, this.particleSystem);
        if (result && result.fired && result.hits) {
            for (const hit of result.hits) {
                this.showHitmarker(hit.isHeadshot);
                if (hit.killed) {
                    this.stats.kills++;
                    this.stats.score += hit.isHeadshot ? 150 : 75;
                    if (hit.isHeadshot) this.stats.headshots++;
                }
            }
        }

        // Also check if bullet hit explosive barrels
        this.defensesManager.checkBarrelBulletHit(
            this.raycaster,
            this.weaponSystem.currentWeapon.damage,
            this.zombiesManager,
            this.particleSystem
        );
    }

    performMeleeAttack() {
        if (this.player.stamina < 20) return;
        this.player.stamina -= 20;

        if (window.soundEngine) {
            window.soundEngine.playMeleeSwing();
        }

        // Forward cleave cone check
        const cleaveRange = 2.8;
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.player.rotation);
        let hitAny = false;

        for (const z of this.zombiesManager.zombies) {
            if (z.state === 'dead') continue;
            const toZ = z.mesh.position.clone().sub(this.player.position);
            const dist = toZ.length();
            if (dist <= cleaveRange) {
                toZ.normalize();
                if (forward.dot(toZ) > 0.45) { // 120-degree frontal arc
                    hitAny = true;
                    z.health -= 110;
                    if (window.soundEngine) window.soundEngine.playMeleeHit();
                    this.particleSystem.createBloodSplatter(z.mesh.position.clone().setY(1.4), forward, true);

                    if (z.health <= 0) {
                        this.zombiesManager.killZombie(z, true, forward);
                        this.stats.kills++;
                        this.stats.score += 120;
                        this.showHitmarker(true);
                    }
                }
            }
        }
    }

    performInteraction() {
        // Check proximity to ammo crate on catwalk
        if (this.defensesManager.checkSupplyCrateProximity(this.player.position)) {
            this.weaponSystem.refillAmmo();
            this.player.armor = this.player.maxArmor;
            if (window.soundEngine) {
                window.soundEngine.playDeployDefense();
            }
            this.showInteractionFeedback("AMMO & ARMOR RESTOCKED!");
        }
    }

    showInteractionFeedback(msg) {
        if (!this.ui.interactPrompt) return;
        this.ui.interactPrompt.innerText = msg;
        this.ui.interactPrompt.style.display = 'block';
        setTimeout(() => {
            if (this.ui.interactPrompt) this.ui.interactPrompt.style.display = 'none';
        }, 2000);
    }

    showHitmarker(isHeadshot) {
        if (isHeadshot) {
            if (this.ui.headshotSkull) {
                this.ui.headshotSkull.classList.remove('active');
                void this.ui.headshotSkull.offsetWidth; // retrigger animation
                this.ui.headshotSkull.classList.add('active');
            }
        } else {
            if (this.ui.hitmarker) {
                this.ui.hitmarker.classList.remove('active');
                void this.ui.hitmarker.offsetWidth;
                this.ui.hitmarker.classList.add('active');
            }
        }
    }

    playerTakeDamage(amount, type = 'normal') {
        // Absorb with armor first
        if (this.player.armor > 0) {
            const absorbed = Math.min(this.player.armor, amount * 0.65);
            this.player.armor -= absorbed;
            amount -= absorbed;
        }

        this.player.health = Math.max(0, this.player.health - amount);

        // Flash red damage vignette
        if (this.ui.damageVignette) {
            this.ui.damageVignette.style.opacity = '0.85';
            setTimeout(() => {
                if (this.ui.damageVignette) this.ui.damageVignette.style.opacity = '0';
            }, 300);
        }

        // Camera trauma shake
        this.player.addCameraRecoil((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15);

        // Sound Engine low health update
        if (window.soundEngine) {
            window.soundEngine.setLowHealthEffect(this.player.health / this.player.maxHealth);
        }

        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.state = 'gameover';
        document.exitPointerLock();
        if (this.ui.gameOverScreen) {
            this.ui.gameOverScreen.style.display = 'flex';
            document.getElementById('final-kills').innerText = this.stats.kills;
            document.getElementById('final-headshots').innerText = this.stats.headshots;
            document.getElementById('final-waves').innerText = this.currentWave;
            document.getElementById('final-score').innerText = this.stats.score;
        }
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.exitPointerLock();
            if (this.ui.pauseScreen) this.ui.pauseScreen.style.display = 'flex';
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.container.requestPointerLock();
            if (this.ui.pauseScreen) this.ui.pauseScreen.style.display = 'none';
        }
    }

    updatePlayerMovement(delta) {
        // Sprint logic
        this.player.isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        if (this.player.isSprinting && this.player.stamina > 5) {
            this.player.stamina = Math.max(0, this.player.stamina - this.player.staminaDrain * delta);
        } else {
            this.player.isSprinting = false;
            this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + this.player.staminaRegen * delta);
        }

        const moveSpeed = this.player.isSprinting ? this.player.sprintSpeed : this.player.speed;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);

        const moveDir = new THREE.Vector3();
        if (this.keys['KeyW']) moveDir.add(forward);
        if (this.keys['KeyS']) moveDir.sub(forward);
        if (this.keys['KeyD']) moveDir.add(right);
        if (this.keys['KeyA']) moveDir.sub(right);

        this.player.isMoving = moveDir.lengthSq() > 0.01;

        if (this.player.isMoving) {
            moveDir.normalize();
            this.player.position.addScaledVector(moveDir, moveSpeed * delta);
        }

        // Clamp player to Catwalk Fortification Area
        this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -14.5, 14.5);
        this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -7.2, -0.8);
        this.player.position.y = 4.2; // Catwalk elevation

        // Update player 3D mesh
        if (this.player.mesh) {
            this.player.mesh.position.copy(this.player.position);
            this.player.mesh.rotation.y = this.player.rotation.y;
        }

        // Camera Placement
        if (this.cameraMode === 'first') {
            this.camera.position.set(this.player.position.x, this.player.position.y + 1.65, this.player.position.z);
            this.camera.rotation.set(
                this.player.rotation.x + this.player.cameraRecoil.x,
                this.player.rotation.y + this.player.cameraRecoil.y,
                0,
                'YXZ'
            );
        } else {
            // Third-Person Over-the-shoulder camera
            const offset = new THREE.Vector3(0.7, 1.8, 2.4); // shoulder offset
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
            this.camera.position.copy(this.player.position).add(offset);
            this.camera.rotation.set(
                this.player.rotation.x + this.player.cameraRecoil.x,
                this.player.rotation.y + this.player.cameraRecoil.y,
                0,
                'YXZ'
            );
        }

        // Recover camera recoil smoothly
        this.player.cameraRecoil.lerp(new THREE.Vector2(0, 0), delta * 12);
    }

    updateSearchlights(delta) {
        const time = performance.now() * 0.001;
        this.searchlights.forEach((sl, idx) => {
            const angle = Math.sin(time * 0.8 + idx * Math.PI) * 16;
            sl.target.position.x = sl.light.position.x + angle;
        });

        // Pulsing red beacon
        if (this.beaconLight) {
            this.beaconLight.intensity = 1.0 + Math.sin(time * 6.0) * 1.0;
        }
    }

    updateUI() {
        if (!this.ui.hud) return;

        // Health, Armor, Stamina
        this.ui.healthBar.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        this.ui.armorBar.style.width = `${(this.player.armor / this.player.maxArmor) * 100}%`;
        this.ui.staminaBar.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
        this.ui.healthText.innerText = `${Math.ceil(this.player.health)} HP`;

        // Weapon HUD
        const currentWeapon = this.weaponSystem.currentWeapon;
        this.ui.currentMagText.innerText = this.weaponSystem.isReloading ? '--' : currentWeapon.currentMag;
        this.ui.reserveAmmoText.innerText = currentWeapon.reserveAmmo;
        this.ui.weaponNameText.innerText = currentWeapon.name;
        this.ui.weaponTierText.innerText = currentWeapon.tier;

        // Wave & Swarm Info
        const activeZombies = this.zombiesManager.getActiveZombieCount();
        this.ui.waveNumberText.innerText = `WAVE ${this.currentWave}`;
        this.ui.enemiesLeftText.innerText = `${activeZombies} ZEKES`;

        // Threat Meter
        if (activeZombies > 40) {
            this.ui.threatText.innerText = 'APOCALYPSE SWARM';
            this.ui.threatText.style.color = '#ff1100';
            if (window.soundEngine) window.soundEngine.setMusicIntensity(2);
        } else if (activeZombies > 10) {
            this.ui.threatText.innerText = 'HORDE ENGAGED';
            this.ui.threatText.style.color = '#ff7700';
            if (window.soundEngine) window.soundEngine.setMusicIntensity(1);
        } else {
            this.ui.threatText.innerText = 'CALM / CLEANUP';
            this.ui.threatText.style.color = '#00ff88';
            if (window.soundEngine) window.soundEngine.setMusicIntensity(0);
        }

        // Stats
        this.ui.scoreText.innerText = this.stats.score;
        this.ui.killsText.innerText = this.stats.kills;
        this.ui.headshotsText.innerText = this.stats.headshots;

        // Check if wave is defeated
        if (this.waveState === 'combat' && activeZombies === 0) {
            this.waveState = 'prep';
            this.stats.wavesCleared++;
            this.showWaveBanner("WAVE CLEARED!", "Refill ammo and prepare for the next horde breach in 6 seconds.");
            setTimeout(() => {
                if (this.state === 'playing') {
                    this.startNextWave();
                }
            }, 6000);
        }

        // Ammo Crate proximity prompt
        const nearCrate = this.defensesManager.checkSupplyCrateProximity(this.player.position);
        if (nearCrate && this.ui.interactPrompt && this.ui.interactPrompt.style.display !== 'block') {
            this.ui.interactPrompt.innerText = "PRESS [E] TO RESUPPLY AMMO & ARMOR";
            this.ui.interactPrompt.style.display = 'block';
        } else if (!nearCrate && this.ui.interactPrompt && this.ui.interactPrompt.innerText.includes("PRESS [E]")) {
            this.ui.interactPrompt.style.display = 'none';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.state === 'playing') {
            // Automatic weapon firing while holding Left Click
            if (this.mouse.isDown && this.weaponSystem.currentWeapon.automatic) {
                this.handleFireWeapon();
            }

            this.updatePlayerMovement(delta);
            this.weaponSystem.update(delta);
            this.weaponSystem.updateGrenades(delta, this.zombiesManager, this.particleSystem);
            this.zombiesManager.update(delta, this.player, this.defensesManager, this.particleSystem);
            this.defensesManager.update(delta, this.zombiesManager, this.particleSystem);
            this.particleSystem.update(delta, this.player);
            this.updateSearchlights(delta);
            this.updateUI();
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Instantiate game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
