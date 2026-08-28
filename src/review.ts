/**
 * Marketplace review prompt.
 *
 * Vendored on purpose — this is not an npm package. The canonical copy lives in the
 * extensions workspace at `shared/review.ts`, and every extension keeps a byte-identical
 * copy at `src/review.ts` so syncing is a plain `cp`. If you change it in one place,
 * copy it to the others.
 *
 * Depends on nothing but the `vscode` API.
 */
import * as vscode from "vscode";

export interface ReviewManagerConfig {
  /**
   * Marketplace extension identifier, `publisher.name` (e.g. "lucasprag.dont-git-lost").
   * Used to build the VS Code Marketplace and Open VSX review links.
   */
  extensionId: string;
  /** Display name shown in the prompt (e.g., "Don't Git Lost") */
  extensionName: string;
  /**
   * Unique command prefix for this extension (e.g., "dontgitlost.review").
   * Command registered as `<prefix>.rate`.
   * Required because VS Code's command registry is global — two extensions cannot
   * register the same command ID.
   */
  commandPrefix: string;
  /** Days of use before the first prompt appears (default: 14) */
  gracePeriodDays?: number;
  /** Days between reminder prompts (default: 30) */
  reminderIntervalDays?: number;
  /** Stop prompting after this many prompts, even if the user never answers (default: 3) */
  maxPrompts?: number;
  /** Always show the prompt on activation, ignoring grace period and history. For development only. */
  forcePrompt?: boolean;
}

const STATE_PREFIX = "lucasprag.review";
const FIRST_USE_KEY = `${STATE_PREFIX}.firstUseDate`;
const LAST_PROMPT_KEY = `${STATE_PREFIX}.lastPromptDate`;
const PROMPT_COUNT_KEY = `${STATE_PREFIX}.promptCount`;
const DONE_KEY = `${STATE_PREFIX}.done`;

/** Written by the old license manager; reused so long-time users keep their real start date. */
const LEGACY_FIRST_USE_KEY = "lucasprag.firstUseDate";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Asks users to review the extension on the marketplaces it ships to.
 *
 * The extensions are free and fully functional — reviews are the only thing
 * asked in return. The prompt is a plain (non-modal) notification that appears
 * after a grace period, repeats a few times at most, and stops for good once the
 * user rates it or dismisses it.
 */
export class ReviewManager {
  private context: vscode.ExtensionContext;
  private config: Required<ReviewManagerConfig>;

  constructor(context: vscode.ExtensionContext, config: ReviewManagerConfig) {
    this.context = context;
    this.config = {
      gracePeriodDays: 14,
      reminderIntervalDays: 30,
      maxPrompts: 3,
      forcePrompt: false,
      ...config,
    };
  }

  /**
   * Call once in your extension's `activate` function.
   * Registers the rate command and schedules the review prompt.
   */
  async initialize(): Promise<void> {
    this.registerCommands();
    this.recordFirstUse();
    await this.schedulePrompt();
  }

  // ---------------------------------------------------------------------------
  // Marketplace links
  // ---------------------------------------------------------------------------

  /** VS Code Marketplace page, scrolled to the review form. */
  get marketplaceUrl(): string {
    return `https://marketplace.visualstudio.com/items?itemName=${this.config.extensionId}&ssr=false#review-details`;
  }

  /** Open VSX reviews tab. */
  get openVsxUrl(): string {
    const [publisher, ...rest] = this.config.extensionId.split(".");
    return `https://open-vsx.org/extension/${publisher}/${rest.join(".")}/reviews`;
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  private registerCommands(): void {
    this.context.subscriptions.push(
      vscode.commands.registerCommand(`${this.config.commandPrefix}.rate`, () =>
        this.rateCommand()
      )
    );
  }

  /** Palette entry: let the user pick which marketplace to review on. */
  private async rateCommand(): Promise<void> {
    const marketplace = "VS Code Marketplace";
    const openVsx = "Open VSX Registry";

    const choice = await vscode.window.showQuickPick([marketplace, openVsx], {
      title: `Review ${this.config.extensionName}`,
      placeHolder: "Where did you install the extension from?",
    });

    if (!choice) return;
    await this.openReviewPage(choice === openVsx ? this.openVsxUrl : this.marketplaceUrl);
  }

  private async openReviewPage(url: string): Promise<void> {
    await this.markDone();
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  // ---------------------------------------------------------------------------
  // Prompt scheduling
  // ---------------------------------------------------------------------------

  private recordFirstUse(): void {
    if (this.context.globalState.get<string>(FIRST_USE_KEY)) return;

    const legacy = this.context.globalState.get<string>(LEGACY_FIRST_USE_KEY);
    void this.context.globalState.update(
      FIRST_USE_KEY,
      legacy ?? new Date().toISOString()
    );
  }

  private daysSince(key: string): number {
    const raw = this.context.globalState.get<string>(key);
    if (!raw) return Infinity;
    return Math.floor((Date.now() - new Date(raw).getTime()) / DAY_MS);
  }

  private async schedulePrompt(): Promise<void> {
    if (this.config.forcePrompt) {
      await this.showPrompt();
      return;
    }
    if (this.context.globalState.get<boolean>(DONE_KEY)) return;
    if ((this.context.globalState.get<number>(PROMPT_COUNT_KEY) ?? 0) >= this.config.maxPrompts) return;

    const firstUse = this.daysSince(FIRST_USE_KEY);
    if (firstUse === Infinity || firstUse < this.config.gracePeriodDays) return;
    if (this.daysSince(LAST_PROMPT_KEY) < this.config.reminderIntervalDays) return;

    await this.showPrompt();
  }

  /** Record the prompt, then hand the notification off without waiting on the user. */
  private async showPrompt(): Promise<void> {
    await this.context.globalState.update(LAST_PROMPT_KEY, new Date().toISOString());
    await this.context.globalState.update(
      PROMPT_COUNT_KEY,
      (this.context.globalState.get<number>(PROMPT_COUNT_KEY) ?? 0) + 1
    );

    // Deliberately not awaited. A notification with buttons stays open until the
    // user acts on it, so awaiting here would block the caller's `activate`.
    void this.presentNotification();
  }

  private async presentNotification(): Promise<void> {
    const marketplace = "Rate on Marketplace";
    const openVsx = "Rate on Open VSX";
    const never = "Don't show again";

    const choice = await vscode.window.showInformationMessage(
      `Enjoying ${this.config.extensionName}? It's free and always will be — a quick review is the best way to support it and help other developers find it.`,
      marketplace,
      openVsx,
      never
    );

    if (choice === marketplace) {
      await this.openReviewPage(this.marketplaceUrl);
    } else if (choice === openVsx) {
      await this.openReviewPage(this.openVsxUrl);
    } else if (choice === never) {
      await this.markDone();
    }
  }

  /** Stop prompting for good. */
  private async markDone(): Promise<void> {
    await this.context.globalState.update(DONE_KEY, true);
  }
}
