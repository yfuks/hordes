# AGENTS.md

This document defines the **agents (human and AI)** involved in the project, their responsibilities, boundaries, and rules of interaction. It acts as a shared contract to keep the architecture clean, scalable, and maintainable.

---

## 🎮 Project Vision

A **2D multiplayer zombie survival game** playable directly in the browser.

* Up to **100 players per room**
* Players **spawn inside a procedurally generated city**
* **Resources are found outside the city** (wilderness, outskirts)
* The **game map is procedurally generated** each session for unique replayability
* Open exploration
* Survival mechanics: gathering, crafting, building
* Players can select a few starting stats (e.g. strength, agility, perception) and improve them by performing related actions during gameplay
* Before entering a game, players can change or set their character's appearance, selecting from available customizations. The character's appearance choice is saved for the user (per browser and/or account) so it is automatically restored for future sessions.
* When a player performs an action that has potential positive or negative consequences, the outcome is determined randomly—but is also influenced by the player's relevant stats
* Every **10 minutes**, a **zombie horde attacks** the city. The wave size increases each time.
* Top-down view, tilemap-based
* Pixel art using PNG assets
* **Server-authoritative architecture** (anti-cheat)

---

## 🧑‍💻 Agent: Game Designer (Human)

### Responsibilities

* Define core gameplay mechanics (zombie survival, crafting, construction, procedurality)
* Design zombie wave escalation system (timing, scaling, composition)
* Design and tune the procedural map generation system
* Balance resources, zombie difficulty, player stats, and progression
* Define win/lose/defense conditions
* Design engaging gameplay loops that reward stat growth and strategic risk
* Specify available character appearance options (e.g. hair, color, outfit, etc.) for player customization before joining a game

### Deliverables

* Game Design Document (GDD)
* Gameplay rules, including zombie wave escalation and stat/action systems
* Balance tables, stat improvement logic, and ratios
* Definition of the character appearance customization system and available options

### Constraints

* Must respect technical limits (100 players per room, real-time sync)
* Avoid frame-perfect or ultra-low-latency mechanics

---

## 🧑‍🎨 Agent: Art / Pixel Artist (Human)

### Responsibilities

* Create PNG sprites (characters, zombies, buildings, resources)
* Create tilesets for city and wilderness, supporting procedural generation
* Maintain consistent art direction
* Provide modular character sprite elements to support customizable appearance (e.g. hair styles, clothes, skin tones) as defined by the Game Designer

### Constraints

* Optimized assets (size, number of frames)
* Strict grid alignment (e.g. 16x16 or 32x32)
* Support for layering/modular combinations for player appearance options

---

## 🖥️ Agent: Game Client (Frontend)

### Tech Stack

* Phaser 3
* TypeScript
* WebSocket

### Responsibilities

* Rendering and camera
* Player input handling
* Client-side interpolation and light prediction
* UI / HUD, including stat selection, character appearance selection, and progression indicators
* Provide an interface for users to create or modify their character's appearance before entering a game session
* Save the chosen character appearance locally (in browser storage) and/or to the user's account, so it is restored in future sessions
* Send chosen or saved appearance to the server during game entry

### Rules

* ❌ Never decides: damage, zombie spawns, stat or map outcomes, resource gain, authoritative collisions
* ✅ Sends player intentions, chosen appearance options, and selected stats/actions only

### Example

```ts
// Save chosen appearance to localStorage/account
saveAppearance({ hair: "spiky", color: "blue", outfit: "jacket" });

// Send selected appearance to server on join
send({ type: "APPEARANCE_SELECT", appearance: { hair: "spiky", color: "blue", outfit: "jacket" } });
send({ type: "ACTION", action: "SEARCH", target: "BUILDING" });
```

---

## 🧠 Agent: Game Server (Authority)

### Tech Stack

* Node.js
* TypeScript
* Colyseus

### Responsibilities

* Single source of truth
* Procedural map generation at game/room start
* Server game loop (ticks)
* Room lifecycle management
* Action validation
* Resolving action outcomes based on randomness combined with player stats
* Stat improvement tracking and progression logic
* Anti-cheat enforcement
* Timing and spawning of zombie waves
* Receiving, validating, and distributing player appearance information for each session (appearance is shared with other players)

### Rules

* Server validates **everything**
* Client can never mutate global state
* Appearance choices must be validated and enforced server-side
* Appearance synchronization and validity is always handled on join

---

## 🗄️ Agent: Persistence (Database)

### Tech Stack

* PostgreSQL (persistent data)
* Redis (ephemeral / cache)

### Responsibilities

* Player profiles, including persistent stats and optionally saved appearance preferences for registered accounts
* Inventories
* World constructions
* Room snapshots

### Rules

* ❌ No per-tick writes
* ✅ Event-based and periodic persistence
* Save and retrieve appearance preferences (for accounts) on login and game entry if applicable

---

## 🤖 AI Agent: Technical Assistant

### Role

* Architecture guidance
* Boilerplate generation
* Code review
* Performance optimization

### Allowed

* Propose patterns and best practices
* Generate example code
* Identify bottlenecks

### Forbidden

* Changing gameplay rules without human validation
* Product or business decisions

---

## 🤖 AI Agent: Gameplay Assistant

### Role

* Balance suggestions
* Gameplay loop simulations
* Mechanics proposals (including zombie wave, procedural map, stat-based outcome mechanics, and appearance system recommendations)

### Limits

* Advisory only
* Requires Game Designer approval

---

## 🔐 Security & Anti-Cheat

### Principles

* Strict server authority
* Speed and position validation
* Range and interaction checks
* Server-side cooldowns
* Server-side validation of appearance data (rejecting invalid or manipulated appearance choices)

### Actions

* Kick
* Soft ban
* Permanent ban

---

## 📦 Recommended Project Structure

```
/game-client
  /assets
  /scenes
  /network

/game-server
  /rooms
  /systems
  /entities
  /schemas

/shared
  /protocols
  /constants
```

---

## 🚀 Future Evolution

* Horizontal room scaling
* Server-driven AI zombie enemies and boss waves
* Dynamic world events (e.g., supply drops, weather affecting zombies)
* Persistent world layers
* Advanced procedural content with stat-based dynamic outcomes
* Expanded player character customization (more appearance options, cosmetics)
* Cross-device account-linked appearance sync

---

## ✅ Golden Rule

> **The client renders. The server decides.**

Any violation of this rule is considered a critical bug.
