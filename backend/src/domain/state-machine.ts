import { AppError } from '../utils/app-error'

export type StateMachine<S extends string> = Readonly<Record<S, readonly S[]>>

export function canTransition<S extends string>(machine: StateMachine<S>, from: S, to: S): boolean {
  const edges = machine[from]
  if (!edges) return false
  return edges.includes(to)
}

export function isTerminal<S extends string>(machine: StateMachine<S>, state: S): boolean {
  const edges = machine[state]
  return !edges || edges.length === 0
}

export function assertTransition<S extends string>(machine: StateMachine<S>, from: S, to: S, entity = 'entity'): void {
  if (!canTransition(machine, from, to)) {
    throw AppError.unprocessable(`Invalid ${entity} transition: ${from} → ${to}`, { from, to })
  }
}
