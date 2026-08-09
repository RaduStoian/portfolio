<template>
  <footer class="footer">
    <span>&copy; {{ year }} Portfolio</span>
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
  padding: 24px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}
</style>
