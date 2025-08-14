import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs'; // For parsing YAML OpenAPI spec

const router = Router();

// Load OpenAPI specification
const openApiSpec = YAML.load('./docs/api/openapi.yaml'); // Path relative to project root

router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;