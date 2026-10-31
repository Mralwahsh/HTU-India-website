import { InputSource } from './InputSource.js'

/**
 * Input for one slot from a phone controller. The presses arrive through Supabase Realtime and are
 * handed over by the FootballHost (src/game/net/FootballHost.js), so the game never knows about networking.
 */
export class SupabaseInputSource extends InputSource {
  constructor(host, slot) {
    super()
    this.off = host.onInput((msg) => {
      if (msg.slot === slot) this.setButton(msg.button, msg.pressed)
    })
  }

  destroy() {
    this.off()
  }
}
