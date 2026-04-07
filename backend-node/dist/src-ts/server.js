"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get('/api/health', (_req, res) => res.json({ status: 'OK', server: 'PSI GovTI (TS scaffold)' }));
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 TS scaffold online na porta ${PORT}`);
});
