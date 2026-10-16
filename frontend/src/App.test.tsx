import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

// Exercise the real page composition rather than excluding App from coverage.
describe('App', () => {
  it('renders the calculator inside the main landmark with its initial state', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument()
    expect(main.getByRole('button', { name: 'Addition' })).toHaveAttribute('aria-pressed', 'true')
    expect(main.getByLabelText('Calculation result')).toHaveTextContent('—')
    expect(main.getByText('Nothing here yet.')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
