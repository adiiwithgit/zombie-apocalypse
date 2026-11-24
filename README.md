# Zombie Apocalypse (WWZ: Aftermath Edition)

[![Play Live Game](https://img.shields.io/badge/PLAY_LIVE-Zombie_Apocalypse-red?style=for-the-badge&logo=googlechrome)](https://adiiwithgit.github.io/zombie-apocalypse/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Active-brightgreen?style=for-the-badge&logo=github)](https://adiiwithgit.github.io/zombie-apocalypse/)

> 🎮 **Play Online Directly in your Browser:** [https://adiiwithgit.github.io/zombie-apocalypse/](https://adiiwithgit.github.io/zombie-apocalypse/)

A high-octane 3D browser game inspired by **World War Z: Aftermath**, featuring massive zombie swarms, climbing pyramid mechanics, first-person & third-person perspectives, deployable defenses, and procedural ballistic and audio synthesis.

---

## 🎮 Key Features

- **Massive Swarms & Climbing Pyramids**:
  - Dozens to hundreds of fast sprinters that swarm toward the defense catwalk.
  - **WWZ Pyramid Climbing**: When reaching the fortification walls, zombies clamber on top of each other, forming a towering pyramid to breach the elevated platform!
  - **Pyramid Destruction**: Shooting base zombies or detonating explosive barrels near the pile collapses the entire pyramid with realistic tumbling physics!
- **First-Person & Third-Person Mode (WWZ Aftermath Signature)**:
  - Press **`V`** to seamlessly switch between **1st-Person View** (with detailed viewmodel weapon sway, ADS zoom, and recoil kick) and **3rd-Person View** (with over-the-shoulder tactical tracking).
- **WWZ Tier Arsenal**:
  - **Primary**: *ARK-103 Tactical Assault Rifle* (Rapid-fire, punchy ballistic sound, tight ADS grouping).
  - **Primary**: *S890 Combat Shotgun* (Pump-action 8-pellet blast, massive knockback against climbing hordes).
  - **Secondary**: *1911 Tactical Pistol* (Snappy semi-auto, high headshot critical multiplier).
  - **Heavy**: *MGL Heavy Grenade Launcher* (Fires 40mm parabolic explosive grenades that wipe out up to 25 zombies in a single blast).
  - **Melee**: Heavy Combat Machete / Cleave (*Key `F`* or *Middle Click*).
- **Special Infected Archetypes**:
  - **The Bull (Charger)**: Heavily armored riot juggernaut. Immune to front chest fire; must be dodged and shot in the exposed back or head!
  - **The Screamer**: Stands back and emits ear-piercing siren screams, summoning endless reinforcements until eliminated.
  - **The Gasbag (Hazmat)**: Explodes into a lingering toxic green gas cloud on body shot death; clean headshots safely defuse it!
  - **The Bomber**: Sprints at the defense line with a rapidly beeping suicide vest, detonating on contact!
- **Tactical Defenses & Fortifications**:
  - **Auto-Turrets**: Dual-barrel automated sentries that track and shred incoming hordes with tracer fire and shell casings.
  - **Barbed Wire Barricades**: Placed at ground chokepoints to trap and bleed rushing zekes.
  - **Explosive Fuel Barrels**: Strategically placed red drums that trigger chain reactions when shot.
  - **Ammo & Armor Supply Crates**: Stand near the crate and press **`E`** to resupply all magazines and restore body armor.
- **WWZ Procedural Audio & VFX**:
  - 100% procedural Web Audio synthesizer: zero missing files or 404s!
  - Punchy rifle cracks, booming shotgun blasts, mechanical reloads, and heavy grenade explosions.
  - Terrifying multi-voice swarm roars and emergency horn klaxons.
  - Satisfying WWZ headshot metallic chime (`DING!`) with skull kill marker and decapitation blood fountains.
  - Dynamic apocalyptic industrial combat music that intensifies with swarm density.

---

## 🕹 Controls

| Action | Control |
| :--- | :--- |
| **Move** | `W`, `A`, `S`, `D` |
| **Sprint** | `Shift` (Consumes Stamina) |
| **Aim / Look** | Mouse (Click screen to lock cursor) |
| **Fire Weapon** | `Left Click` (Hold for full auto) |
| **Aim Down Sights (ADS)** | `Right Click` (Zoom & precision spread) |
| **Reload** | `R` |
| **Weapon Select** | `1`, `2`, `3`, `4` or `Mouse Wheel` |
| **Heavy Melee Cleave** | `F` or `Middle Mouse Click` |
| **Toggle 1st / 3rd Person** | `V` |
| **Resupply Ammo / Interact** | `E` (Near Ammo Crate) |
| **Pause / Tactical Menu** | `ESC` or `P` |

---

## 🚀 How to Run

### Option 1: Direct File Open
Double-click `index.html` or open it directly in Google Chrome, Microsoft Edge, Firefox, or Brave!

### Option 2: Python HTTP Server (Recommended)
Open a terminal inside the project directory and run:
```bash
python server.py
```
This starts the local game server on `http://localhost:8080` and opens it in your default browser automatically.

### Option 3: VS Code Live Server
If you use VS Code:
1. Open the folder `C:\Users\Anand.Chavan\.gemini\antigravity\scratch\zombie-apocalypse` in VS Code.
2. Right-click `index.html` and select **"Open with Live Server"**.
