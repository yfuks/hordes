import { Scene, GameObjects } from "phaser";
import { textStyles } from "../theme";

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

// Placeholder appearance options - will be replaced with actual sprite system
const HAIR_STYLES = ["short", "long", "spiky", "bald"];
const HAIR_COLORS = ["black", "brown", "blonde", "red", "blue"];
const OUTFIT_STYLES = ["casual", "tactical", "survivor", "medic"];

export class CharacterEdit extends Scene {
  private appearance: AppearanceData = {};
  private previewRect!: GameObjects.Rectangle;
  private selectedHairIdx = 0;
  private selectedColorIdx = 0;
  private selectedOutfitIdx = 0;

  constructor() {
    super("CharacterEdit");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Load current appearance
    this.appearance = getStoredAppearance();
    this.selectedHairIdx = HAIR_STYLES.indexOf(this.appearance.hair || "short");
    this.selectedColorIdx = HAIR_COLORS.indexOf(this.appearance.color || "brown");
    this.selectedOutfitIdx = OUTFIT_STYLES.indexOf(this.appearance.outfit || "casual");
    if (this.selectedHairIdx === -1) this.selectedHairIdx = 0;
    if (this.selectedColorIdx === -1) this.selectedColorIdx = 0;
    if (this.selectedOutfitIdx === -1) this.selectedOutfitIdx = 0;

    // Title
    this.add
      .text(512, 80, "Customize Character", {
        fontFamily: "Arial Black",
        fontSize: 42,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Character preview
    this.add
      .text(512, 160, "Preview", {
        fontFamily: "Arial",
        fontSize: 18,
        color: "#666666",
      })
      .setOrigin(0.5);

    this.previewRect = this.add
      .rectangle(512, 220, 120, 120, this.getPreviewColor())
      .setStrokeStyle(3, 0x888888);

    // Options
    const startY = 310;
    const spacing = 80;

    // Hair style
    this.createSelector("Hair Style", HAIR_STYLES, this.selectedHairIdx, startY, (idx) => {
      this.selectedHairIdx = idx;
      this.updateAppearance();
    });

    // Hair color
    this.createSelector("Hair Color", HAIR_COLORS, this.selectedColorIdx, startY + spacing, (idx) => {
      this.selectedColorIdx = idx;
      this.updateAppearance();
    });

    // Outfit
    this.createSelector("Outfit", OUTFIT_STYLES, this.selectedOutfitIdx, startY + spacing * 2, (idx) => {
      this.selectedOutfitIdx = idx;
      this.updateAppearance();
    });

    // Buttons
    const saveBtn = this.add
      .text(412, 630, "Save & Back", textStyles.button)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    saveBtn
      .on("pointerover", () => saveBtn.setStyle(textStyles.buttonHover))
      .on("pointerout", () => saveBtn.setStyle(textStyles.button));
    saveBtn.on("pointerdown", () => this.saveAndBack());

    const cancelBtn = this.add
      .text(612, 630, "Cancel", textStyles.button)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    cancelBtn
      .on("pointerover", () => cancelBtn.setStyle(textStyles.buttonHover))
      .on("pointerout", () => cancelBtn.setStyle(textStyles.button));
    cancelBtn.on("pointerdown", () => this.scene.start("MainMenu"));

    // Info
    this.add
      .text(512, 700, "Customization will be expanded with sprite assets", {
        fontFamily: "Arial",
        fontSize: 12,
        color: "#555555",
      })
      .setOrigin(0.5);
  }

  private createSelector(
    label: string,
    options: string[],
    selectedIdx: number,
    y: number,
    onChange: (idx: number) => void
  ) {
    // Label
    this.add
      .text(280, y, label, {
        fontFamily: "Arial",
        fontSize: 18,
        color: "#cccccc",
      })
      .setOrigin(1, 0.5);

    // Left arrow
    const leftArrow = this.add
      .text(500, y, "◀", {
        fontFamily: "Arial",
        fontSize: 24,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Current value
    const valueText = this.add
      .text(512, y, options[selectedIdx], {
        fontFamily: "Arial",
        fontSize: 20,
        color: "#4ecdc4",
      })
      .setOrigin(0.5);

    // Right arrow
    const rightArrow = this.add
      .text(724, y, "▶", {
        fontFamily: "Arial",
        fontSize: 24,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    leftArrow.on("pointerdown", () => {
      selectedIdx = (selectedIdx - 1 + options.length) % options.length;
      valueText.setText(options[selectedIdx]);
      onChange(selectedIdx);
    });

    rightArrow.on("pointerdown", () => {
      selectedIdx = (selectedIdx + 1) % options.length;
      valueText.setText(options[selectedIdx]);
      onChange(selectedIdx);
    });
  }

  private updateAppearance() {
    this.appearance = {
      hair: HAIR_STYLES[this.selectedHairIdx],
      color: HAIR_COLORS[this.selectedColorIdx],
      outfit: OUTFIT_STYLES[this.selectedOutfitIdx],
    };
    this.previewRect.setFillStyle(this.getPreviewColor());
  }

  private getPreviewColor(): number {
    // Simple color mapping for preview (will be replaced with actual sprites)
    const colorMap: Record<string, number> = {
      black: 0x1a1a1a,
      brown: 0x8b4513,
      blonde: 0xffd700,
      red: 0xff4444,
      blue: 0x4444ff,
    };
    return colorMap[HAIR_COLORS[this.selectedColorIdx]] || 0x4ecdc4;
  }

  private saveAndBack() {
    setStoredAppearance(this.appearance);
    this.scene.start("MainMenu");
  }
}

