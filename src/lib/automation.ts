export type AutomationAction = { type: string; config?: Record<string, unknown> };
export type AutomationRule = {
  id: string;
  name: string;
  trigger_type: string;
  conditions: Record<string, unknown>;
  actions: AutomationAction[];
  enabled: boolean;
};

export function isAllowedAction(action: AutomationAction) {
  return Boolean(action.type && action.type.length <= 80);
}

export function validateActions(actions: AutomationAction[]) {
  return actions.length <= 20 && actions.every(isAllowedAction);
}
