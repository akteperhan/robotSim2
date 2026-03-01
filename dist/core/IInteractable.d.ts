export declare enum InteractableType {
    BUTTON = "BUTTON",
    CHARGING_PAD = "CHARGING_PAD",
    DOOR = "DOOR"
}
export interface IInteractable {
    getType(): InteractableType;
    interact(): void;
    canInteract(): boolean;
}
//# sourceMappingURL=IInteractable.d.ts.map