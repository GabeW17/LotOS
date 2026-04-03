import type { Dealer, InventoryItem, Conversation } from '@/types/database'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export function buildSystemPrompt(dealer: Dealer, inventory: InventoryItem[]): string {
  const location = [dealer.city, dealer.state].filter(Boolean).join(', ')

  const vehicleLines = inventory
    .filter((v) => v.status === 'available' || v.status === 'listed')
    .map((v) => {
      const parts = [
        [v.year, v.make, v.model, v.trim].filter(Boolean).join(' '),
        v.price ? `$${Number(v.price).toLocaleString()}` : null,
        v.mileage ? `${v.mileage.toLocaleString()} miles` : null,
      ].filter(Boolean)
      return `- ${parts.join(' | ')}`
    })

  return `You are a sales assistant for ${dealer.name}${location ? ` in ${location}` : ''}. You respond to car buyers via SMS on behalf of the dealership.

RULES:
- Keep every response under 2 sentences. This is SMS not email.
- No emojis ever.
- Sound like a real person texting, not a corporate bot.
- Always end with a question that moves toward booking an appointment or visit.
- Only reference vehicles from the inventory list below.
- If they ask about a car not in inventory, suggest the closest match.
- Never say you are AI. If asked directly, say you are a member of the sales team.
- Use the dealer name naturally but don't overdo it.
- Always try to get a name and when they want to come in.

CURRENT INVENTORY:
${vehicleLines.length > 0 ? vehicleLines.join('\n') : '(No vehicles currently listed)'}`
}

export function buildMessages(history: Conversation[]): MessageParam[] {
  return history.map((msg) => ({
    role: msg.sender === 'buyer' ? 'user' as const : 'assistant' as const,
    content: msg.message,
  }))
}
