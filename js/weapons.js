/**
 * ZOMBIE APOCALYPSE - WWZ AFTERMATH ARSENAL & WEAPON SYSTEM
 * Implements WWZ Tier weapons, ballistic physics, ADS, recoil, ammo, reload animations, and 3D weapon meshes.
 */

class WeaponSystem {
    constructor(scene, camera, player) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;

        // Weapon definitions based on WWZ Aftermath
        this.weapons = {
            rifle: {
                id: 'rifle',
                name: 'ARK-103 Assault Rifle',
                tier: 'Tier II',
                type: 'primary',
                damage: 48,
                headshotMult: 2.8,
                fireRate: 105, // ms between shots (~570 RPM)
                magSize: 30,
                currentMag: 30,
                reserveAmmo: 360,
                maxReserve: 360,
                reloadTime: 1800, // ms
                spread: 0.022,
                adsSpread: 0.006,
                recoilV: 0.035,
                recoilH: 0.015,
                pellets: 1,
                automatic: true,
                range: 120,
                projectileSpeed: 300,
                color: 0x222222,
                accentColor: 0x8b5a2b // wood / tactical grip
            },
            shotgun: {
                id: 'shotgun',
                name: 'S890 Combat Shotgun',
                tier: 'Tier II',
                type: 'primary',
                damage: 32,
                headshotMult: 2.2,
                fireRate: 850, // ms
                magSize: 8,
                currentMag: 8,
                reserveAmmo: 72,
                maxReserve: 72,
                reloadTime: 2200,
                spread: 0.075,
                adsSpread: 0.045,
                recoilV: 0.09,
                recoilH: 0.03,
                pellets: 8,
                automatic: false,
                range: 45,
                projectileSpeed: 240,
                color: 0x1a1a1a,
                accentColor: 0x333333
            },
            pistol: {
                id: 'pistol',
                name: '1911 Tactical Pistol',
                tier: 'Tier I',
                type: 'secondary',
                damage: 38,
                headshotMult: 3.0,
                fireRate: 180,
                magSize: 15,
                currentMag: 15,
                reserveAmmo: 150,
                maxReserve: 150,
                reloadTime: 1200,
                spread: 0.018,
                adsSpread: 0.005,
                recoilV: 0.028,
                recoilH: 0.01,
                pellets: 1,
                automatic: false,
                range: 80,
                projectileSpeed: 260,
                color: 0x3a3a3a,
                accentColor: 0x111111
            },
            launcher: {
                id: 'launcher',
                name: 'MGL Heavy Grenade Launcher',
                tier: 'Heavy',
                type: 'heavy',
                damage: 280,
                blastRadius: 7.5,
                fireRate: 700,
                magSize: 4,
                currentMag: 4,
                reserveAmmo: 12,
                maxReserve: 12,
                reloadTime: 2600,
                spread: 0.015,
                adsSpread: 0.008,
                recoilV: 0.12,
                recoilH: 0.04,
                pellets: 1,
                isExplosive: true,
                automatic: false,
                range: 80,
                projectileSpeed: 60,
                color: 0x2b382b,
                accentColor: 0x555555
            }
        };

        this.inventory = ['rifle', 'shotgun', 'pistol', 'launcher'];
        this.currentWeaponIndex = 0;
        this.currentWeapon = this.weapons[this.inventory[this.currentWeaponIndex]];

        this.lastShotTime = 0;
        this.isReloading = false;
        this.reloadStartTime = 0;
        this.isAiming = false;

        // Visual recoil state
        this.recoilOffset = new THREE.Vector3();
        this.recoilRotation = new THREE.Vector3();

        // 3D Viewmodels for FPS view
        this.fpsWeaponGroup = new THREE.Group();
        this.camera.add(this.fpsWeaponGroup);
        this.weaponMeshes = {};

        this.activeGrenades = [];
        this.initWeaponMeshes();
    }

    initWeaponMeshes() {
        // Build procedural, detailed 3D gun models using Three.js primitives
        // 1. Rifle Mesh
        const rifleGroup = new THREE.Group();
        const rifleMat = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.4, metalness: 0.7 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.8 }); // wood/composite
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.9 });

        // Receiver & Barrel
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), rifleMat);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12), metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.45);

        // Handguard
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.3), gripMat);
        handguard.position.set(0, 0, -0.3);

        // Magazine (curved WWZ style)
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.1), metalMat);
        mag.position.set(0, -0.14, -0.05);
        mag.rotation.x = 0.25;

        // Grip & Stock
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), gripMat);
        grip.position.set(0, -0.12, 0.15);
        grip.rotation.x = -0.35;

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.32), gripMat);
        stock.position.set(0, -0.02, 0.36);

        // Holographic sight
        const holoBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.14), metalMat);
        holoBase.position.set(0, 0.08, -0.05);
        const holoGlass = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.06, 0.01),
            new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.4 })
        );
        holoGlass.position.set(0, 0.11, -0.05);

        // Muzzle flash point
        const muzzleLight = new THREE.PointLight(0xffaa22, 0, 10);
        muzzleLight.position.set(0, 0.02, -0.7);

        rifleGroup.add(receiver, barrel, handguard, mag, grip, stock, holoBase, holoGlass, muzzleLight);
        rifleGroup.position.set(0.24, -0.22, -0.48);
        this.fpsWeaponGroup.add(rifleGroup);
        this.weaponMeshes['rifle'] = { group: rifleGroup, muzzleLight: muzzleLight, muzzlePos: new THREE.Vector3(0, 0.02, -0.7) };

        // 2. Shotgun Mesh
        const shotgunGroup = new THREE.Group();
        const sReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.5), rifleMat);
        const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 12), metalMat);
        sBarrel.rotation.x = Math.PI / 2;
        sBarrel.position.set(0, 0.03, -0.45);
        const sTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), metalMat);
        sTube.rotation.x = Math.PI / 2;
        sTube.position.set(0, -0.02, -0.43);
        const sPump = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12), gripMat);
        sPump.rotation.x = Math.PI / 2;
        sPump.position.set(0, -0.02, -0.38);
        const sStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.35), gripMat);
        sStock.position.set(0, -0.05, 0.35);

        const sMuzzleLight = new THREE.PointLight(0xff8800, 0, 14);
        sMuzzleLight.position.set(0, 0.03, -0.75);

        shotgunGroup.add(sReceiver, sBarrel, sTube, sPump, sStock, sMuzzleLight);
        shotgunGroup.position.set(0.24, -0.22, -0.48);
        shotgunGroup.visible = false;
        this.fpsWeaponGroup.add(shotgunGroup);
        this.weaponMeshes['shotgun'] = { group: shotgunGroup, muzzleLight: sMuzzleLight, muzzlePos: new THREE.Vector3(0, 0.03, -0.75) };

        // 3. Pistol Mesh
        const pistolGroup = new THREE.Group();
        const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.28), metalMat);
        pSlide.position.set(0, 0.04, -0.05);
        const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.25), rifleMat);
        pFrame.position.set(0, -0.01, -0.05);
        const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.08), gripMat);
        pGrip.position.set(0, -0.1, 0.03);
        pGrip.rotation.x = -0.25;

        const pMuzzleLight = new THREE.PointLight(0xffcc44, 0, 8);
        pMuzzleLight.position.set(0, 0.04, -0.22);

        pistolGroup.add(pSlide, pFrame, pGrip, pMuzzleLight);
        pistolGroup.position.set(0.2, -0.18, -0.4);
        pistolGroup.visible = false;
        this.fpsWeaponGroup.add(pistolGroup);
        this.weaponMeshes['pistol'] = { group: pistolGroup, muzzleLight: pMuzzleLight, muzzlePos: new THREE.Vector3(0, 0.04, -0.22) };

        // 4. Heavy Grenade Launcher Mesh
        const launcherGroup = new THREE.Group();
        const lDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 16), metalMat);
        lDrum.rotation.z = Math.PI / 2;
        lDrum.position.set(0, 0, -0.05);
        const lBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.45, 16), metalMat);
        lBarrel.rotation.x = Math.PI / 2;
        lBarrel.position.set(0, 0.02, -0.35);
        const lStock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.35), rifleMat);
        lStock.position.set(0, -0.04, 0.25);
        const lGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), gripMat);
        lGrip.position.set(0, -0.14, 0.08);

        const lMuzzleLight = new THREE.PointLight(0xff5500, 0, 16);
        lMuzzleLight.position.set(0, 0.02, -0.6);

        launcherGroup.add(lDrum, lBarrel, lStock, lGrip, lMuzzleLight);
        launcherGroup.position.set(0.24, -0.22, -0.48);
        launcherGroup.visible = false;
        this.fpsWeaponGroup.add(launcherGroup);
        this.weaponMeshes['launcher'] = { group: launcherGroup, muzzleLight: lMuzzleLight, muzzlePos: new THREE.Vector3(0, 0.02, -0.6) };

        this.updateActiveWeaponMesh();
    }

    switchWeapon(index) {
        if (this.isReloading) return;
        if (index < 0 || index >= this.inventory.length) return;
        this.currentWeaponIndex = index;
        this.currentWeapon = this.weapons[this.inventory[index]];
        this.updateActiveWeaponMesh();
        if (window.soundEngine) {
            window.soundEngine.playReload(2);
        }
    }

    nextWeapon() {
        const next = (this.currentWeaponIndex + 1) % this.inventory.length;
        this.switchWeapon(next);
    }

    prevWeapon() {
        const prev = (this.currentWeaponIndex - 1 + this.inventory.length) % this.inventory.length;
        this.switchWeapon(prev);
    }

    updateActiveWeaponMesh() {
        for (const key in this.weaponMeshes) {
            this.weaponMeshes[key].group.visible = (key === this.currentWeapon.id);
        }
    }

    setAiming(aiming) {
        this.isAiming = aiming;
    }

    canShoot() {
        const now = performance.now();
        if (this.isReloading) return false;
        if (this.currentWeapon.currentMag <= 0) return false;
        if (now - this.lastShotTime < this.currentWeapon.fireRate) return false;
        return true;
    }

    shoot(raycaster, zombiesManager, particleSystem) {
        const now = performance.now();

        // Dry fire check
        if (this.currentWeapon.currentMag <= 0) {
            if (now - this.lastShotTime > 300) {
                if (window.soundEngine) window.soundEngine.playDryFire();
                this.lastShotTime = now;
            }
            return null;
        }

        if (!this.canShoot()) return null;

        this.lastShotTime = now;
        this.currentWeapon.currentMag--;

        // Audio trigger based on weapon
        if (window.soundEngine) {
            switch (this.currentWeapon.id) {
                case 'rifle':
                    window.soundEngine.playRifleShot();
                    break;
                case 'shotgun':
                    window.soundEngine.playShotgunShot();
                    break;
                case 'pistol':
                    window.soundEngine.playPistolShot();
                    break;
                case 'launcher':
                    window.soundEngine.playHeavyLauncherShot();
                    break;
            }
        }

        // Apply recoil to viewmodel and camera
        this.applyRecoil();

        // Muzzle flash light pulse
        const activeMesh = this.weaponMeshes[this.currentWeapon.id];
        if (activeMesh && activeMesh.muzzleLight) {
            activeMesh.muzzleLight.intensity = 2.5;
            setTimeout(() => {
                if (activeMesh.muzzleLight) activeMesh.muzzleLight.intensity = 0;
            }, 45);
        }

        // Heavy Grenade Launcher: Projectile Physics
        if (this.currentWeapon.isExplosive) {
            this.spawnGrenade();
            return { fired: true, explosive: true };
        }

        // Hitscan weapons (Rifle, Shotgun, Pistol) with pellet spread
        const hits = [];
        const pelletCount = this.currentWeapon.pellets || 1;
        const currentSpread = this.isAiming ? this.currentWeapon.adsSpread : this.currentWeapon.spread;

        for (let i = 0; i < pelletCount; i++) {
            // Calculate randomized spread vector
            const spreadX = (Math.random() - 0.5) * currentSpread;
            const spreadY = (Math.random() - 0.5) * currentSpread;

            // Forward ray from camera
            const cameraDir = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDir);

            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

            const shotDir = cameraDir.clone()
                .add(right.multiplyScalar(spreadX))
                .add(up.multiplyScalar(spreadY))
                .normalize();

            raycaster.set(this.camera.position, shotDir);

            // Tracer origin from gun muzzle in world space
            const muzzleWorldPos = new THREE.Vector3();
            if (activeMesh) {
                activeMesh.group.localToWorld(muzzleWorldPos.copy(activeMesh.muzzlePos));
            } else {
                muzzleWorldPos.copy(this.camera.position);
            }

            // Check hit against zombies and environment
            const hitResult = zombiesManager.checkBulletHit(
                raycaster,
                this.currentWeapon.damage,
                this.currentWeapon.headshotMult,
                shotDir
            );

            let hitPoint;
            if (hitResult && hitResult.hit) {
                hitPoint = hitResult.point;
                hits.push(hitResult);
            } else {
                // Fly off into distance
                hitPoint = this.camera.position.clone().add(shotDir.multiplyScalar(this.currentWeapon.range));
            }

            // Spawn visual bullet tracer
            if (particleSystem) {
                particleSystem.createTracer(muzzleWorldPos, hitPoint, this.currentWeapon.id === 'shotgun' ? 0xffbb44 : 0xffee88);
                if (hitResult && hitResult.hit) {
                    if (hitResult.isHeadshot) {
                        particleSystem.createBloodSplatter(hitPoint, shotDir, true);
                    } else {
                        particleSystem.createBloodSplatter(hitPoint, shotDir, false);
                    }
                } else {
                    particleSystem.createSparkImpact(hitPoint, shotDir);
                }
            }
        }

        return { fired: true, hits: hits };
    }

    spawnGrenade() {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);

        const grenadeGeo = new THREE.SphereGeometry(0.12, 10, 10);
        const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x223322, metalness: 0.8, roughness: 0.2 });
        const grenadeMesh = new THREE.Mesh(grenadeGeo, grenadeMat);

        grenadeMesh.position.copy(this.camera.position).add(camDir.clone().multiplyScalar(0.8));
        this.scene.add(grenadeMesh);

        const velocity = camDir.clone().multiplyScalar(42).add(new THREE.Vector3(0, 4, 0));

        this.activeGrenades.push({
            mesh: grenadeMesh,
            velocity: velocity,
            life: 2.2, // fuse time
            damage: this.currentWeapon.damage,
            radius: this.currentWeapon.blastRadius
        });
    }

    updateGrenades(delta, zombiesManager, particleSystem) {
        for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
            const g = this.activeGrenades[i];
            g.life -= delta;

            // Apply gravity
            g.velocity.y -= 25 * delta;
            g.mesh.position.addScaledVector(g.velocity, delta);

            // Ground bounce
            if (g.mesh.position.y < 0.2) {
                g.mesh.position.y = 0.2;
                g.velocity.y = -g.velocity.y * 0.45;
                g.velocity.x *= 0.7;
                g.velocity.z *= 0.7;
            }

            // Direct contact check with any zombie or timer expiration
            const distToZombie = zombiesManager.getClosestZombieDistance(g.mesh.position);
            if (distToZombie < 1.2 || g.life <= 0) {
                // Detonate Grenade!
                this.detonateGrenade(g.mesh.position, g.damage, g.radius, zombiesManager, particleSystem);
                this.scene.remove(g.mesh);
                this.activeGrenades.splice(i, 1);
            }
        }
    }

    detonateGrenade(position, damage, radius, zombiesManager, particleSystem) {
        if (window.soundEngine) {
            window.soundEngine.playExplosion(1.5);
        }
        if (particleSystem) {
            particleSystem.createExplosion(position, radius);
        }
        // AOE damage to zombies and collapse climbing pyramids nearby!
        zombiesManager.applyAreaOfEffect(position, damage, radius);
    }

    applyRecoil() {
        const v = this.currentWeapon.recoilV;
        const h = (Math.random() - 0.5) * this.currentWeapon.recoilH;

        this.recoilOffset.z += 0.08;
        this.recoilRotation.x += v;
        this.recoilRotation.y += h;

        // Player camera kick
        if (this.player) {
            this.player.addCameraRecoil(v * 0.6, h * 0.4);
        }
    }

    reload() {
        if (this.isReloading) return;
        if (this.currentWeapon.currentMag >= this.currentWeapon.magSize) return;
        if (this.currentWeapon.reserveAmmo <= 0) return;

        this.isReloading = true;
        this.reloadStartTime = performance.now();

        if (window.soundEngine) {
            window.soundEngine.playReload(1);
            setTimeout(() => {
                if (this.isReloading && window.soundEngine) window.soundEngine.playReload(2);
            }, this.currentWeapon.reloadTime * 0.5);
            setTimeout(() => {
                if (this.isReloading && window.soundEngine) window.soundEngine.playReload(3);
            }, this.currentWeapon.reloadTime * 0.85);
        }
    }

    refillAmmo() {
        for (const key in this.weapons) {
            const w = this.weapons[key];
            w.reserveAmmo = w.maxReserve;
            w.currentMag = w.magSize;
        }
    }

    update(delta) {
        // Handle reload completion
        if (this.isReloading) {
            const elapsed = performance.now() - this.reloadStartTime;
            if (elapsed >= this.currentWeapon.reloadTime) {
                const needed = this.currentWeapon.magSize - this.currentWeapon.currentMag;
                const available = Math.min(needed, this.currentWeapon.reserveAmmo);
                this.currentWeapon.currentMag += available;
                this.currentWeapon.reserveAmmo -= available;
                this.isReloading = false;
            }
        }

        // Animate First-Person Weapon Model & Recoil Recovery
        const activeMesh = this.weaponMeshes[this.currentWeapon.id];
        if (activeMesh) {
            const group = activeMesh.group;

            // Target positions for hipfire vs ADS (Aim Down Sights)
            let targetX = 0.24;
            let targetY = -0.22;
            let targetZ = -0.48;

            if (this.currentWeapon.id === 'pistol') {
                targetX = 0.18;
                targetY = -0.16;
                targetZ = -0.38;
            }

            if (this.isAiming) {
                // Center the weapon directly in front of camera
                targetX = 0.0;
                targetY = -0.14;
                targetZ = -0.32;
            }

            // Weapon sway / bobbing based on player movement
            let swayX = 0;
            let swayY = 0;
            if (this.player && this.player.isMoving) {
                const bobFreq = this.player.isSprinting ? 12 : 7;
                const bobAmp = this.isAiming ? 0.003 : 0.015;
                const t = performance.now() * 0.001 * bobFreq;
                swayX = Math.sin(t) * bobAmp;
                swayY = Math.abs(Math.cos(t)) * bobAmp * 0.8;
            }

            // Reload dip animation
            let reloadDip = 0;
            if (this.isReloading) {
                const progress = (performance.now() - this.reloadStartTime) / this.currentWeapon.reloadTime;
                reloadDip = Math.sin(progress * Math.PI) * -0.15;
            }

            // Smooth interpolation to target
            group.position.x = THREE.MathUtils.lerp(group.position.x, targetX + swayX + this.recoilOffset.x, delta * 15);
            group.position.y = THREE.MathUtils.lerp(group.position.y, targetY + swayY + reloadDip + this.recoilOffset.y, delta * 15);
            group.position.z = THREE.MathUtils.lerp(group.position.z, targetZ + this.recoilOffset.z, delta * 15);

            group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, this.recoilRotation.x, delta * 20);
            group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, this.recoilRotation.y, delta * 20);

            // Recover recoil back to zero
            this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), delta * 12);
            this.recoilRotation.lerp(new THREE.Vector3(0, 0, 0), delta * 12);
        }
    }
}

window.WeaponSystem = WeaponSystem;
