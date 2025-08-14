import { Container } from './Container';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-16">
      <Container>
        <div className="text-center text-gray-600">
          <p>&copy; 2024 Deeper Bible. NIV Translation.</p>
        </div>
      </Container>
    </footer>
  );
}