<template>
  <footer class="footer">
    <span>&copy; {{ year }} Radu Stoian</span>
    <a href="mailto:radu.stoian0@gmail.com" class="email">radu.stoian0@gmail.com</a>
    <RouterLink to="/play" class="play">or try the pixel-art version &rarr;</RouterLink>
  </footer>
</template>

<script>
export default {
  name: 'SiteFooter',
  computed: {
    year() {
      return new Date().getFullYear();
    },
  },
};
</script>

<style scoped>
.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 20px;
  padding: 28px 24px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13.5px;
  text-align: center;
}

.footer a {
  color: var(--text-muted);
  text-decoration: none;
}

.footer a:hover {
  color: var(--accent);
}
</style>
