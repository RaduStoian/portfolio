<template>
  <section class="page">
    <h1 class="display">Get in touch</h1>
    <p class="lede">
      Anything you send here goes straight to my inbox. If you'd rather email
      me directly, use
      <a href="mailto:radu.stoian0@gmail.com">radu.stoian0@gmail.com</a>.
    </p>

    <form v-if="status !== 'sent'" class="form" @submit.prevent="submit">
      <label>
        <span>Name</span>
        <input v-model.trim="form.name" type="text" name="name" required maxlength="120" :disabled="status === 'sending'" />
      </label>
      <label>
        <span>Email</span>
        <input v-model.trim="form.email" type="email" name="email" required maxlength="190" :disabled="status === 'sending'" />
      </label>
      <label>
        <span>Message</span>
        <textarea v-model.trim="form.message" name="message" rows="6" required maxlength="5000" :disabled="status === 'sending'"></textarea>
      </label>

      <!-- Honeypot: hidden from real visitors, irresistible to bots that fill every field. -->
      <input v-model="form.website" type="text" name="website" class="honeypot" tabindex="-1" autocomplete="off" />

      <button type="submit" class="btn primary" :disabled="status === 'sending'">
        {{ status === 'sending' ? 'Sending…' : 'Send message' }}
      </button>

      <p v-if="status === 'error'" class="error">That didn't send. Try again, or email me directly.</p>
    </form>

    <p v-else class="sent">Message sent. I'll get back to you soon.</p>
  </section>
</template>

<script>
export default {
  name: 'ContactPage',
  data() {
    return {
      form: { name: '', email: '', message: '', website: '' },
      status: 'idle', // idle | sending | sent | error
    };
  },
  methods: {
    async submit() {
      this.status = 'sending';
      try {
        await window.axios.post('/api/contact', this.form);
        this.status = 'sent';
      } catch {
        this.status = 'error';
      }
    },
  },
};
</script>

<style scoped>
.page {
  max-width: 580px;
  margin: 0 auto;
  padding: 100px 24px 130px;
}

h1 {
  font-size: clamp(38px, 6.5vw, 68px);
  text-align: center;
}

.lede {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 17px;
  text-align: center;
  margin: 22px 0 56px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
  color: var(--text-muted);
}

input,
textarea {
  font: inherit;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--border);
  padding: 13px 16px;
  resize: vertical;
  transition: border-color 0.2s ease;
}

input:hover,
textarea:hover {
  border-color: var(--hairline-strong);
}

input:focus,
textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.btn {
  align-self: flex-start;
  padding: 12px 24px;
  border: none;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: var(--accent);
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  color: #e2694f;
  font-size: 13.5px;
}

.sent {
  color: var(--text-muted);
  font-size: 15px;
}
</style>
