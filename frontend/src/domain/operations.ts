export const OPERATIONS = [
  { id: 'add', label: 'Addition', symbol: '+', group: 'basic', description: 'Add two numbers', needsSecondOperand: true },
  { id: 'subtract', label: 'Subtraction', symbol: '−', group: 'basic', description: 'Find the difference', needsSecondOperand: true },
  { id: 'multiply', label: 'Multiplication', symbol: '×', group: 'basic', description: 'Multiply two numbers', needsSecondOperand: true },
  { id: 'divide', label: 'Division', symbol: '÷', group: 'basic', description: 'Divide two numbers', needsSecondOperand: true },
  { id: 'power', label: 'Exponentiation', symbol: 'xʸ', group: 'advanced', description: 'Raise a number to a power', needsSecondOperand: true },
  { id: 'sqrt', label: 'Square root', symbol: '√', group: 'advanced', description: 'Find a principal square root', needsSecondOperand: false },
  { id: 'percent', label: 'Percentage', symbol: '%', group: 'advanced', description: 'Calculate a percentage of a value', needsSecondOperand: true },
] as const

export type Operation = (typeof OPERATIONS)[number]['id']
export type OperationDefinition = (typeof OPERATIONS)[number]

export function getOperation(operation: Operation): OperationDefinition {
  return OPERATIONS.find((item) => item.id === operation) ?? OPERATIONS[0]
}
