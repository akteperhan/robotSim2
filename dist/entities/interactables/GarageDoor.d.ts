import { IInteractable, InteractableType } from '../../core/IInteractable';
export declare class GarageDoor implements IInteractable {
    private isOpen;
    constructor();
    getType(): InteractableType;
    interact(): void;
    canInteract(): boolean;
    getIsOpen(): boolean;
}
//# sourceMappingURL=GarageDoor.d.ts.map