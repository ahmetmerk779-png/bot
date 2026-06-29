let currentPlan = null;
let planStep = 0;

async function execute(bot, params) {
  const goal = params[0];
  const steps = params.slice(1);

  if (!goal) return 'Plan hedefi belirtilmedi.';
  if (steps.length === 0) return 'Plan adımları belirtilmedi.';

  currentPlan = { goal, steps, step: 0 };
  planStep = 0;
  bot.chat(`📋 Plan oluşturuldu: ${goal}`);
  bot.chat(`Adımlar: ${steps.join(' -> ')}`);
  return `Plan oluşturuldu: ${goal}`;
}

function getNextStep() {
  if (!currentPlan || planStep >= currentPlan.steps.length) return null;
  return currentPlan.steps[planStep++];
}

function getPlanProgress() {
  if (!currentPlan) return null;
  return {
    goal: currentPlan.goal,
    step: planStep,
    total: currentPlan.steps.length,
    currentStep: currentPlan.steps[planStep - 1] || 'Tamamlandı'
  };
}

function resetPlan() {
  currentPlan = null;
  planStep = 0;
}

module.exports = { execute, getNextStep, getPlanProgress, resetPlan };
