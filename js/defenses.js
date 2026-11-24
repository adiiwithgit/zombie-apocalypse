/**
 * ZOMBIE APOCALYPSE - WWZ AFTERMATH DEFENSE SYSTEM
 * Auto-Turrets, Barbed Wire Barricades, Explosive Fuel Barrels, and Supply Crates.
 */

class DefensesManager {
    constructor(scene) {
        this.scene = scene;
        this.turrets = [];
        this.barbedWires = [];
        this.explosiveBarrels = [];
        this.supplyCrates = [];

        this.initMaterials();
        this.spawnPreplacedDefenses();
    }

    initMaterials() {
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
        this.barrelMat = new THREE.MeshStandardMaterial({ color: 0xcc2211, roughness: 0.4 }); // red explosive
        this.wireMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.2 });
        this.crateMat = new THREE.MeshStandardMaterial({ color: 0x2e402e, roughness: 0.8 }); // military green
    }

    spawnPreplacedDefenses() {
        // 1. Supply Crate on the Catwalk
        this.createSupplyCrate(new THREE.Vector3(0, 4.2, -4.5));

        // 2. Pre-deployed Auto-Turret on Catwalk corner
        this.createAutoTurret(new THREE.Vector3(-10, 4.2, -7.5));
        this.createAutoTurret(new THREE.Vector3(10, 4.2, -7.5));

        // 3. Barbed Wire at Ground Chokepoints
        this.createBarbedWire(new THREE.Vector3(-6, 0, -14));
        this.createBarbedWire(new THREE.Vector3(6, 0, -14));

        // 4. Red Explosive Barrels in the Courtyard Swarm Path
        const barrelPositions = [
            new THREE.Vector3(-8, 0.7, -10),
            new THREE.Vector3(8, 0.7, -10),
            new THREE.Vector3(0, 0.7, -18),
            new THREE.Vector3(-15, 0.7, -22),
            new THREE.Vector3(15, 0.7, -22)
        ];
        barrelPositions.forEach(pos => this.createExplosiveBarrel(pos));
    }

    createAutoTurret(pos) {
        const group = new THREE.Group();

        // Tripod Base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.6, 0.8, 6), this.metalMat);
        base.position.y = 0.4;
        group.add(base);

        // Rotating Turret Head
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.85;

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.5), this.metalMat);
        // Dual Barrels
        const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), this.metalMat);
        barrel1.rotation.x = Math.PI / 2;
        barrel1.position.set(-0.1, 0.02, -0.4);
        const barrel2 = barrel1.clone();
        barrel2.position.set(0.1, 0.02, -0.4);

        // Muzzle flash light
        const flashLight = new THREE.PointLight(0xffaa00, 0, 10);
        flashLight.position.set(0, 0.02, -0.75);

        // Ammo Drum
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), this.metalMat);
        drum.position.set(-0.25, -0.05, 0);
        drum.rotation.z = Math.PI / 2;

        headGroup.add(body, barrel1, barrel2, drum, flashLight);
        group.add(headGroup);

        group.position.copy(pos);
        this.scene.add(group);

        const turret = {
            group: group,
            head: headGroup,
            flashLight: flashLight,
            pos: pos.clone(),
            range: 35,
            fireRate: 120, // ms between shots
            lastFireTime: 0,
            ammo: 250,
            maxAmmo: 250,
            damage: 28,
            target: null
        };

        this.turrets.push(turret);
        return turret;
    }

    createBarbedWire(pos) {
        const group = new THREE.Group();

        // Wooden cross stakes with coiled wire
        const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), this.crateMat);
        post1.position.set(-1.8, 0.55, 0);
        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), this.crateMat);
        post2.position.set(1.8, 0.55, 0);

        // Coiled cylinder wire
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.8, 8, 1, true), this.wireMat);
        wire.rotation.z = Math.PI / 2;
        wire.position.y = 0.45;

        group.add(post1, post2, wire);
        group.position.copy(pos);
        this.scene.add(group);

        const barricade = {
            group: group,
            pos: pos.clone(),
            width: 4.0,
            durability: 100,
            maxDurability: 100
        };

        this.barbedWires.push(barricade);
        return barricade;
    }

    createExplosiveBarrel(pos) {
        const group = new THREE.Group();
        const barrelGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12);
        const mesh = new THREE.Mesh(barrelGeo, this.barrelMat);
        mesh.position.y = 0.6;
        mesh.name = 'barrel';

        // Warning Hazard Stripes Decal / Ring
        const ringGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.25, 12);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffee00 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.6;

        group.add(mesh, ring);
        group.position.copy(pos);
        this.scene.add(group);

        const barrel = {
            group: group,
            mesh: mesh,
            pos: pos.clone(),
            health: 40,
            isExploded: false
        };

        this.explosiveBarrels.push(barrel);
        return barrel;
    }

    createSupplyCrate(pos) {
        const group = new THREE.Group();
        const crateGeo = new THREE.BoxGeometry(1.6, 0.8, 0.9);
        const mesh = new THREE.Mesh(crateGeo, this.crateMat);
        mesh.position.y = 0.4;

        // White Ammo Cross Decal
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.92), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        crossH.position.y = 0.4;
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.92), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        crossV.position.y = 0.4;

        group.add(mesh, crossH, crossV);
        group.position.copy(pos);
        this.scene.add(group);

        this.supplyCrates.push({
            group: group,
            pos: pos.clone(),
            interactionRadius: 2.8
        });
    }

    checkBarbedWireContact(pos, delta) {
        for (let i = this.barbedWires.length - 1; i >= 0; i--) {
            const wire = this.barbedWires[i];
            const dist = Math.abs(pos.z - wire.pos.z);
            const distCross = Math.abs(pos.x - wire.pos.x);

            if (dist < 1.0 && distCross < wire.width / 2) {
                wire.durability -= 1.5 * delta;
                if (wire.durability <= 0) {
                    this.scene.remove(wire.group);
                    this.barbedWires.splice(i, 1);
                }
                return true;
            }
        }
        return false;
    }

    checkBarrelBulletHit(raycaster, damage, zombiesManager, particleSystem) {
        const barrelMeshes = this.explosiveBarrels.filter(b => !b.isExploded).map(b => b.mesh);
        const intersects = raycaster.intersectObjects(barrelMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const barrel = this.explosiveBarrels.find(b => b.mesh === hit.object);
            if (barrel && !barrel.isExploded) {
                barrel.health -= damage;
                if (barrel.health <= 0) {
                    this.detonateBarrel(barrel, zombiesManager, particleSystem);
                }
                return { hit: true, point: hit.point };
            }
        }
        return null;
    }

    detonateBarrel(barrel, zombiesManager, particleSystem) {
        barrel.isExploded = true;
        this.scene.remove(barrel.group);

        if (window.soundEngine) {
            window.soundEngine.playExplosion(2.0);
        }

        if (particleSystem) {
            particleSystem.createExplosion(barrel.pos.clone().setY(1.0), 9.0);
        }

        // Obliterate zombies and collapse climbing pyramids in huge 9-meter radius!
        zombiesManager.applyAreaOfEffect(barrel.pos, 350, 9.0);

        // Chain react to nearby barrels!
        for (const other of this.explosiveBarrels) {
            if (!other.isExploded && other !== barrel) {
                const dist = other.pos.distanceTo(barrel.pos);
                if (dist < 7.5) {
                    setTimeout(() => {
                        if (!other.isExploded) {
                            this.detonateBarrel(other, zombiesManager, particleSystem);
                        }
                    }, 180);
                }
            }
        }
    }

    update(delta, zombiesManager, particleSystem) {
        const now = performance.now();

        // Update Auto-Turrets
        for (const turret of this.turrets) {
            if (turret.ammo <= 0) continue;

            // Find closest living zombie in front
            let closestZombie = null;
            let minDist = turret.range;

            for (const z of zombiesManager.zombies) {
                if (z.state === 'dead') continue;
                const d = turret.pos.distanceTo(z.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    closestZombie = z;
                }
            }

            if (closestZombie) {
                // Aim head towards target
                const targetPos = closestZombie.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
                turret.head.lookAt(targetPos);

                // Fire turret
                if (now - turret.lastFireTime >= turret.fireRate) {
                    turret.lastFireTime = now;
                    turret.ammo--;

                    if (window.soundEngine) {
                        window.soundEngine.playTurretFire();
                    }

                    // Muzzle flash
                    turret.flashLight.intensity = 2.0;
                    setTimeout(() => { turret.flashLight.intensity = 0; }, 40);

                    // Tracer
                    if (particleSystem) {
                        const muzzlePos = new THREE.Vector3();
                        turret.head.getWorldPosition(muzzlePos);
                        particleSystem.createTracer(muzzlePos, targetPos, 0xffcc33);
                        particleSystem.createBloodSplatter(targetPos, targetPos.clone().sub(muzzlePos).normalize(), false);
                    }

                    // Damage target
                    closestZombie.health -= turret.damage;
                    if (closestZombie.health <= 0) {
                        zombiesManager.killZombie(closestZombie, false);
                    }
                }
            }
        }
    }

    checkSupplyCrateProximity(playerPos) {
        for (const crate of this.supplyCrates) {
            if (crate.pos.distanceTo(playerPos) <= crate.interactionRadius) {
                return true;
            }
        }
        return false;
    }
}

window.DefensesManager = DefensesManager;
