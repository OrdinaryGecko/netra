import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input"]

  format() {
    const value = this.inputTarget.value.trim()
    if (!value.length) return

    try {
      this.inputTarget.value = JSON.stringify(JSON.parse(value), null, 2)
    } catch (_error) {
      this.inputTarget.classList.add("json-editor--invalid")
      window.setTimeout(() => this.inputTarget.classList.remove("json-editor--invalid"), 1200)
    }
  }
}
