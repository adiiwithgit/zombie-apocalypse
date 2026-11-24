/**
 * ZOMBIE APOCALYPSE - WWZ AFTERMATH PARTICLE & VFX SYSTEM
 * Bullet tracers, visceral blood bursts, headshot decapitation fountains, fire explosions, and toxic clouds.
 */

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.tracers = [];
        this.clouds = [];

        // Pre-create shared materials for extreme 60+ FPS performance
        this.bloodMat = new THREE.MeshBasicMaterial({ color: 0x8a0303 });
        this.headshotBloodMat = new THREE.MeshBasicMaterial({ color: 0xaa0505 });
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        this.fireMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
        this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6 });
        this.gasMat = new THREE.MeshBasicMaterial({ color: 0x22bb33, transparent: true, opacity: 0.45 });

        this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        this.largeParticleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        this.cloudGeo = new THREE.SphereGeometry(1.5, 8, 8);
    }

    createTracer(from, to, color = 0xffee88) {
        const points = [from.clone(), to.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.tracers.push({
            mesh: line,
            life: 0.06 // very fast flash
        });
    }

    createBloodSplatter(point, direction, isHeadshot = false) {
        const count = isHeadshot ? 24 : 12;
        const mat = isHeadshot ? this.headshotBloodMat : this.bloodMat;

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.particleGeo, mat);
            mesh.position.copy(point);

            // Spray backwards/outwards from bullet impact
            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 3 + (isHeadshot ? 3.5 : 1.0),
                (Math.random() - 0.5) * 4
            );

            // Add reverse bullet impulse
            const vel = direction.clone().multiplyScalar(-3).add(spread);

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: vel,
                gravity: 14,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                scaleDecay: true
            });
        }
    }

    createSparkImpact(point, normal) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.particleGeo, this.sparkMat);
            mesh.position.copy(point);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 4 + 1,
                (Math.random() - 0.5) * 6
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: vel,
                gravity: 16,
                life: 0.25,
                maxLife: 0.25,
                scaleDecay: true
            });
        }
    }

    createExplosion(position, radius = 6.0) {
        // 1. Fiery Core Burst
        const count = 35;
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.largeParticleGeo, Math.random() > 0.4 ? this.fireMat : this.sparkMat);
            mesh.position.copy(position);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 10 + Math.random() * 20;

            const vel = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.abs(Math.cos(phi)) * speed * 1.2 + 4,
                Math.sin(phi) * Math.sin(theta) * speed
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: vel,
                gravity: 12,
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
                scaleDecay: true
            });
        }

        // 2. Rising Smoke Plumes
        for (let i = 0; i < 10; i++) {
            const smoke = new THREE.Mesh(this.largeParticleGeo, this.smokeMat);
            smoke.position.copy(position).add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5,
                (Math.random() - 0.5) * 2
            ));

            const sVel = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                2.5 + Math.random() * 3,
                (Math.random() - 0.5) * 2
            );

            this.scene.add(smoke);
            this.particles.push({
                mesh: smoke,
                velocity: sVel,
                gravity: -1.0, // floats up
                life: 1.5 + Math.random() * 0.8,
                maxLife: 2.3,
                scaleExpand: true
            });
        }
    }

    createToxicGasCloud(position) {
        const cloudMesh = new THREE.Mesh(this.cloudGeo, this.gasMat);
        cloudMesh.position.copy(position).setY(1.2);
        this.scene.add(cloudMesh);

        this.clouds.push({
            mesh: cloudMesh,
            position: position.clone(),
            radius: 4.5,
            life: 8.0, // stays for 8 seconds
            maxLife: 8.0,
            damagePerSec: 18
        });
    }

    update(delta, player) {
        // Update bullet tracers
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const t = this.tracers[i];
            t.life -= delta;
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                this.tracers.splice(i, 1);
            }
        }

        // Update physics particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            // Apply gravity
            p.velocity.y -= p.gravity * delta;
            p.mesh.position.addScaledVector(p.velocity, delta);

            // Ground floor collision
            if (p.mesh.position.y < 0.05) {
                p.mesh.position.y = 0.05;
                p.velocity.x *= 0.5;
                p.velocity.z *= 0.5;
                p.velocity.y = 0;
            }

            // Scale decay / expand
            const progress = p.life / p.maxLife;
            if (p.scaleDecay) {
                p.mesh.scale.setScalar(Math.max(0.01, progress));
            } else if (p.scaleExpand) {
                p.mesh.scale.setScalar(1.0 + (1.0 - progress) * 2.5);
            }
        }

        // Update Toxic Gas Clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const c = this.clouds[i];
            c.life -= delta;

            if (c.life <= 0) {
                this.scene.remove(c.mesh);
                this.clouds.splice(i, 1);
                continue;
            }

            // Gentle pulsing animation
            const scale = 1.0 + Math.sin(c.life * 3) * 0.15;
            c.mesh.scale.set(scale, scale * 0.7, scale);

            // Check if player is inside the toxic cloud
            if (player) {
                const dist = player.position.distanceTo(c.position);
                if (dist < c.radius) {
                    player.takeDamage(c.damagePerSec * delta, 'gas');
                }
            }
        }
    }
}

window.ParticleSystem = ParticleSystem;
