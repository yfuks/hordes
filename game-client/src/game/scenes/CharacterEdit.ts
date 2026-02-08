import { Scene, GameObjects } from "phaser";

const APPEARANCE_KEY = "hordes_appearance";

export type AppearanceData = Record<string, string>;

export function getStoredAppearance(): AppearanceData {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    return raw ? (JSON.parse(raw) as AppearanceData) : {};
  } catch {
    return {};
  }
}

export function setStoredAppearance(appearance: AppearanceData): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
}

export class CharacterEdit extends Scene {
  constructor() {
    super("CharacterEdit");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    this.add
      .text(512, 120, "Edit character", {
        fontFamily: "Arial Black",
        fontSize: 42,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(512, 220, "Appearance options (placeholder)", {
        fontFamily: "Arial",
        fontSize: 20,
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    // Placeholder: later add hair, color, outfit selects per AGENTS.md
    const appearance = getStoredAppearance();
    const preview = this.add
      .text(512, 320, Object.keys(appearance).length ? JSON.stringify(appearance) : "No options set", {
        fontFamily: "Arial",
        fontSize: 16,
        color: "#cccccc",
      })
      .setOrigin(0.5);

    const back = this.add
      .text(512, 450, "Back to menu", {
        fontFamily: "Arial Black",
        fontSize: 24,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    back.on("pointerdown", () => this.scene.start("MainMenu"));
  }
}
