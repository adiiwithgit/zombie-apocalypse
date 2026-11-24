/**
 * ZOMBIE APOCALYPSE - WWZ AFTERMATH SWARM & CLIMBING PYRAMID SYSTEM
 * Massive swarms, climbing pyramid stacks, collapse physics, and special infected (Bull, Screamer, Gasbag, Bomber).
 */

class ZombiesManager {
    constructor(scene, platformBounds) {
        this.scene = scene;
        this.platformBounds = platformBounds; // { minX, maxX, minZ, maxZ, height: 4.2 }

        this.zombies = [];
        this.climbingPyramids = []; // Active pyramid climb points along the wall
        this.screamerTimer = 0;

        // Shared geometries & materials for peak performance
        this.initMaterials();

        // Climbing wall parameters
        this.wallZ = -8.0; // Front defense wall of the catwalk
        this.catwalkHeight = 4.2;
    }

    initMaterials() {
        this.skinMat = new THREE.MeshStandardMaterial({ color: 0x6e7864, roughness: 0.8 }); // pale sickly undead
        this.clothesMats = [
            new THREE.MeshStandardMaterial({ color: 0x3d424b, roughness: 0.9 }), // dark shirt
            new THREE.MeshStandardMaterial({ color: 0x5a3d31, roughness: 0.9 }), // brown flannel
            new THREE.MeshStandardMaterial({ color: 0x2e3532, roughness: 0.9 })  // worker grey
        ];
        this.bloodDecalMat = new THREE.MeshBasicMaterial({ color: 0x660000 });
        this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffeedd }); // glowing milky dead eyes

        // Specials
        this.bullMat = new THREE.MeshStandardMaterial({ color: 0x1f2329, metalness: 0.8, roughness: 0.3 }); // Riot armor
        this.gasbagMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.5 }); // Yellow Hazmat
        this.screamerMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.7 });
        this.bomberLedMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }

    createZombieMesh(type = 'regular') {
        const group = new THREE.Group();

        let bodyMat = this.clothesMats[Math.floor(Math.random() * this.clothesMats.length)];
        let skinMat = this.skinMat;

        if (type === 'bull') bodyMat = this.bullMat;
        if (type === 'gasbag') bodyMat = this.gasbagMat;
        if (type === 'screamer') bodyMat = this.screamerMat;

        // Torso
        const torsoWidth = type === 'bull' ? 0.75 : 0.45;
        const torsoHeight = type === 'bull' ? 0.85 : 0.65;
        const torsoDepth = type === 'bull' ? 0.45 : 0.28;
        const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 1.05;
        torso.name = 'torso';
        group.add(torso);

        // Head
        const headRadius = type === 'bull' ? 0.22 : 0.17;
        const headGeo = new THREE.SphereGeometry(headRadius, 8, 8);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.05 + torsoHeight / 2 + headRadius + 0.04;
        head.name = 'head';

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
        const leftEye = new THREE.Mesh(eyeGeo, this.eyeMat);
        leftEye.position.set(0.06, 0.02, headRadius - 0.02);
        const rightEye = new THREE.Mesh(eyeGeo, this.eyeMat);
        rightEye.position.set(-0.06, 0.02, headRadius - 0.02);
        head.add(leftEye, rightEye);

        // Special accessories
        if (type === 'bull') {
            // Riot Helmet & Visor
            const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.48), this.bullMat);
            helmet.position.y = 0.06;
            head.add(helmet);
        } else if (type === 'screamer') {
            // Megaphone attached to chest
            const megaGeo = new THREE.ConeGeometry(0.14, 0.35, 8);
            const mega = new THREE.Mesh(megaGeo, new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
            mega.rotation.x = -Math.PI / 2;
            mega.position.set(0, 0.1, 0.25);
            torso.add(mega);
        } else if (type === 'bomber') {
            // Flashing C4 / Dynamite Vest
            const bomb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.18), new THREE.MeshStandardMaterial({ color: 0x222222 }));
            bomb.position.set(0, 0, 0.2);
            const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), this.bomberLedMat);
            led.position.set(0, 0.1, 0.1);
            bomb.add(led);
            torso.add(bomb);
            group.bomberLed = led;
        }

        group.add(head);

        // Limbs (Left/Right Arm and Legs)
        const limbMat = bodyMat;
        const armGeo = new THREE.BoxGeometry(0.14, 0.65, 0.14);
        const leftArm = new THREE.Mesh(armGeo, limbMat);
        leftArm.position.set(-torsoWidth / 2 - 0.09, 1.0, 0.1);
        leftArm.rotation.x = 0.4; // reaching forward menacingly
        const rightArm = new THREE.Mesh(armGeo, limbMat);
        rightArm.position.set(torsoWidth / 2 + 0.09, 1.0, 0.1);
        rightArm.rotation.x = 0.4;
        group.add(leftArm, rightArm);

        const legGeo = new THREE.BoxGeometry(0.16, 0.75, 0.16);
        const leftLeg = new THREE.Mesh(legGeo, limbMat);
        leftLeg.position.set(-0.14, 0.38, 0);
        const rightLeg = new THREE.Mesh(legGeo, limbMat);
        rightLeg.position.set(0.14, 0.38, 0);
        group.add(leftLeg, rightLeg);

        group.userData = {
            head: head,
            torso: torso,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg
        };

        return group;
    }

    spawnZombie(type = 'regular', spawnPos = null) {
        let x, z;
        if (spawnPos) {
            x = spawnPos.x;
            z = spawnPos.z;
        } else {
            // Spawn out in the courtyard or breach tunnels (z: -35 to -50)
            x = (Math.random() - 0.5) * 50;
            z = -42 - Math.random() * 25;
        }

        const mesh = this.createZombieMesh(type);
        mesh.position.set(x, 0, z);
        this.scene.add(mesh);

        let health = 60;
        let speed = 4.8 + Math.random() * 2.2; // fast WWZ sprint
        let damage = 14;

        if (type === 'bull') {
            health = 380;
            speed = 7.5; // fast charging juggernaut
            damage = 38;
        } else if (type === 'gasbag') {
            health = 90;
            speed = 4.2;
            damage = 18;
        } else if (type === 'screamer') {
            health = 110;
            speed = 3.5;
            damage = 10;
        } else if (type === 'bomber') {
            health = 50;
            speed = 6.2;
            damage = 75;
        }

        const zombie = {
            mesh: mesh,
            type: type,
            health: health,
            maxHealth: health,
            speed: speed,
            damage: damage,
            state: 'running', // 'running', 'climbing', 'on_catwalk', 'charging', 'dead'
            climbProgress: 0,
            climbStackLevel: 0,
            climbX: x,
            velocity: new THREE.Vector3(),
            attackCooldown: 0,
            deathTimer: 0,
            isHeadless: false,
            animOffset: Math.random() * 10
        };

        this.zombies.push(zombie);
        return zombie;
    }

    spawnHordeWave(count, specialProbabilities = { bull: 0.05, screamer: 0.03, gasbag: 0.06, bomber: 0.05 }) {
        if (window.soundEngine) {
            window.soundEngine.playSwarmRoar();
            window.soundEngine.playHordeKlaxon();
            window.soundEngine.setMusicIntensity(2);
        }

        for (let i = 0; i < count; i++) {
            let type = 'regular';
            const roll = Math.random();
            if (roll < specialProbabilities.bull) type = 'bull';
            else if (roll < specialProbabilities.bull + specialProbabilities.screamer) type = 'screamer';
            else if (roll < specialProbabilities.bull + specialProbabilities.screamer + specialProbabilities.gasbag) type = 'gasbag';
            else if (roll < specialProbabilities.bull + specialProbabilities.screamer + specialProbabilities.gasbag + specialProbabilities.bomber) type = 'bomber';

            // Stagger spawn positions slightly in wave clusters
            const clusterX = (Math.random() - 0.5) * 40;
            const spawnPos = {
                x: clusterX + (Math.random() - 0.5) * 12,
                z: -40 - Math.random() * 25
            };

            setTimeout(() => {
                this.spawnZombie(type, spawnPos);
            }, i * 40); // rapid rolling spawn stream
        }
    }

    checkBulletHit(raycaster, damage, headshotMult, shotDir) {
        // Collect all meshes of living zombies
        const hitCandidates = [];
        for (const z of this.zombies) {
            if (z.state === 'dead') continue;
            hitCandidates.push(z.mesh.userData.head);
            hitCandidates.push(z.mesh.userData.torso);
        }

        const intersects = raycaster.intersectObjects(hitCandidates, false);
        if (intersects.length === 0) return null;

        const hit = intersects[0];
        const hitMesh = hit.object;

        // Find parent zombie
        let targetZombie = null;
        for (const z of this.zombies) {
            if (z.mesh.userData.head === hitMesh || z.mesh.userData.torso === hitMesh) {
                targetZombie = z;
                break;
            }
        }

        if (!targetZombie) return null;

        const isHeadshot = (hitMesh.name === 'head');
        let finalDamage = damage;

        if (isHeadshot) {
            finalDamage *= headshotMult;
        }

        // Bull special: armored front
        if (targetZombie.type === 'bull' && !isHeadshot) {
            // Check if shot from behind
            const zombieForward = new THREE.Vector3(0, 0, 1).applyQuaternion(targetZombie.mesh.quaternion);
            const dot = shotDir.dot(zombieForward);
            if (dot < 0.2) {
                // Bullet hit armored chest/front
                finalDamage *= 0.25;
            }
        }

        targetZombie.health -= finalDamage;

        // Sound triggers
        if (window.soundEngine) {
            if (isHeadshot) {
                window.soundEngine.playHeadshot();
            } else {
                window.soundEngine.playBodyHit();
            }
        }

        // Apply knockback
        targetZombie.velocity.add(shotDir.clone().multiplyScalar(isHeadshot ? 4 : 2));

        // Check death
        let killed = false;
        if (targetZombie.health <= 0) {
            killed = true;
            this.killZombie(targetZombie, isHeadshot, shotDir);
        }

        return {
            hit: true,
            point: hit.point,
            isHeadshot: isHeadshot,
            killed: killed,
            zombie: targetZombie,
            damageDealt: finalDamage
        };
    }

    applyAreaOfEffect(center, maxDamage, radius) {
        // Explode climbing pyramids and damage surrounding zombies
        let affectedCount = 0;
        let pyramidCollapsed = false;

        for (const z of this.zombies) {
            if (z.state === 'dead') continue;
            const dist = z.mesh.position.distanceTo(center);
            if (dist <= radius) {
                affectedCount++;
                const falloff = 1 - (dist / radius);
                const damage = maxDamage * falloff;
                z.health -= damage;

                // Massive blast impulse
                const pushDir = z.mesh.position.clone().sub(center).normalize();
                pushDir.y += 0.8;
                z.velocity.add(pushDir.multiplyScalar(falloff * 24));

                if (z.state === 'climbing') {
                    pyramidCollapsed = true;
                    z.state = 'running';
                    z.mesh.position.y = 0;
                }

                if (z.health <= 0) {
                    this.killZombie(z, false, pushDir);
                }
            }
        }

        if (pyramidCollapsed && window.soundEngine) {
            window.soundEngine.playPyramidCollapse();
        }

        return affectedCount;
    }

    killZombie(zombie, isHeadshot, impulseDir = null) {
        zombie.state = 'dead';
        zombie.deathTimer = 2.5; // sink into ground before removal

        // Decapitation if headshot
        if (isHeadshot && zombie.mesh.userData.head) {
            zombie.mesh.userData.head.scale.set(0.01, 0.01, 0.01);
            zombie.isHeadless = true;
        }

        // Special: Gasbag death without headshot emits toxic gas
        if (zombie.type === 'gasbag') {
            if (!isHeadshot && window.game && window.game.particleSystem) {
                window.game.particleSystem.createToxicGasCloud(zombie.mesh.position);
            }
        }

        // Special: Bomber death triggers explosion
        if (zombie.type === 'bomber') {
            if (window.game && window.game.weaponSystem) {
                window.game.weaponSystem.detonateGrenade(
                    zombie.mesh.position,
                    140,
                    5.5,
                    this,
                    window.game.particleSystem
                );
            }
        }

        // Ragdoll-like collapse rotation
        zombie.mesh.rotation.x = Math.PI / 2;
        zombie.mesh.position.y = 0.2;
    }

    update(delta, player, defensesManager, particleSystem) {
        const now = performance.now();

        // Screamer logic: Summon swarms while alive
        let screamerActive = false;
        for (const z of this.zombies) {
            if (z.type === 'screamer' && z.state !== 'dead') {
                screamerActive = true;
                break;
            }
        }

        if (screamerActive) {
            this.screamerTimer += delta;
            if (this.screamerTimer > 5.5) {
                this.screamerTimer = 0;
                if (window.soundEngine) window.soundEngine.playScreamerWail();
                this.spawnHordeWave(6, { bull: 0, screamer: 0, gasbag: 0, bomber: 0.15 });
            }
        }

        // Update each zombie
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const z = this.zombies[i];

            // Dead state
            if (z.state === 'dead') {
                z.deathTimer -= delta;
                if (z.deathTimer < 1.0) {
                    // Sink into ground
                    z.mesh.position.y -= delta * 0.4;
                }
                if (z.deathTimer <= 0) {
                    this.scene.remove(z.mesh);
                    this.zombies.splice(i, 1);
                }
                continue;
            }

            // Flashing light for Bomber
            if (z.type === 'bomber' && z.mesh.bomberLed) {
                const flash = Math.sin(now * 0.015) > 0;
                z.mesh.bomberLed.material.color.setHex(flash ? 0xff0000 : 0x220000);
                if (flash && Math.random() < 0.08 && window.soundEngine) {
                    window.soundEngine.playBomberBeep();
                }
            }

            // Check Barbed Wire slow down from defenses
            let speedMult = 1.0;
            if (defensesManager) {
                const slowed = defensesManager.checkBarbedWireContact(z.mesh.position, delta);
                if (slowed) {
                    speedMult = 0.3; // 70% slow down in wire
                    z.health -= 8 * delta; // bleed damage
                    if (z.health <= 0) {
                        this.killZombie(z, false);
                        continue;
                    }
                }
            }

            // Movement & WWZ Swarm Clambering AI
            if (z.state === 'running') {
                // If on ground (z < wallZ), rush towards the front defense wall (Z = wallZ)
                if (z.mesh.position.z < this.wallZ) {
                    // Steer toward wall and player X
                    const targetX = THREE.MathUtils.clamp(player.position.x + (Math.random() - 0.5) * 8, -14, 14);
                    const targetZ = this.wallZ;

                    const moveDir = new THREE.Vector3(targetX - z.mesh.position.x, 0, targetZ - z.mesh.position.z).normalize();
                    z.mesh.position.addScaledVector(moveDir, z.speed * speedMult * delta);
                    z.mesh.lookAt(targetX, z.mesh.position.y, targetZ + 10);

                    // WWZ Pyramid Climbing Trigger: Reached the wall!
                    if (z.mesh.position.z >= this.wallZ - 0.4) {
                        z.mesh.position.z = this.wallZ - 0.4;
                        z.state = 'climbing';
                        z.climbX = z.mesh.position.x;
                        z.climbProgress = 0;
                    }
                }
            } else if (z.state === 'climbing') {
                // WWZ PYRAMID CLIMBING LOGIC
                // Climb vertically up the defense wall onto the player's catwalk!
                const climbSpeed = 1.6 + Math.random() * 0.8;
                z.climbProgress += climbSpeed * delta;
                z.mesh.position.y = z.climbProgress;
                z.mesh.position.z = this.wallZ - 0.3;

                // Animate flailing/clambering limbs
                if (z.mesh.userData.leftArm) {
                    z.mesh.userData.leftArm.rotation.x = Math.PI - Math.sin(now * 0.01 + z.animOffset) * 0.8;
                    z.mesh.userData.rightArm.rotation.x = Math.PI + Math.cos(now * 0.01 + z.animOffset) * 0.8;
                }

                // Top reached: Vault over railing onto catwalk!
                if (z.mesh.position.y >= this.catwalkHeight) {
                    z.mesh.position.y = this.catwalkHeight;
                    z.mesh.position.z = this.wallZ + 0.8; // hopped onto catwalk floor
                    z.state = 'on_catwalk';
                }
            } else if (z.state === 'on_catwalk') {
                // On the catwalk: directly pursue the player!
                const toPlayer = player.position.clone().sub(z.mesh.position);
                const distToPlayer = toPlayer.length();
                toPlayer.y = 0;
                toPlayer.normalize();

                z.mesh.position.addScaledVector(toPlayer, z.speed * speedMult * delta);
                z.mesh.lookAt(player.position.x, z.mesh.position.y, player.position.z);

                // Attack Player when within melee range
                if (distToPlayer < 1.6) {
                    z.attackCooldown -= delta;
                    if (z.attackCooldown <= 0) {
                        z.attackCooldown = 0.9;
                        player.takeDamage(z.damage, z.type);
                        if (window.soundEngine) window.soundEngine.playZombieGrowl();

                        // Bomber explodes on contact
                        if (z.type === 'bomber') {
                            this.killZombie(z, false);
                        }
                    }
                }
            }

            // Running Leg/Arm animation
            if (z.state === 'running' || z.state === 'on_catwalk') {
                const animT = now * 0.012 * (z.speed / 4) + z.animOffset;
                if (z.mesh.userData.leftLeg) {
                    z.mesh.userData.leftLeg.rotation.x = Math.sin(animT) * 0.7;
                    z.mesh.userData.rightLeg.rotation.x = -Math.sin(animT) * 0.7;
                    z.mesh.userData.leftArm.rotation.x = -Math.sin(animT) * 0.8;
                    z.mesh.userData.rightArm.rotation.x = Math.sin(animT) * 0.8;
                }
            }

            // Apply residual physics velocity
            if (z.velocity.lengthSq() > 0.01) {
                z.mesh.position.addScaledVector(z.velocity, delta);
                z.velocity.multiplyScalar(0.85); // friction dampening
            }
        }
    }

    getClosestZombieDistance(position) {
        let minDist = 9999;
        for (const z of this.zombies) {
            if (z.state === 'dead') continue;
            const d = z.mesh.position.distanceTo(position);
            if (d < minDist) minDist = d;
        }
        return minDist;
    }

    getActiveZombieCount() {
        return this.zombies.filter(z => z.state !== 'dead').length;
    }
}

window.ZombiesManager = ZombiesManager;
