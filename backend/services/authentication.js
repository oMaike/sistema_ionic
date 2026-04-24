require('dotenv').config();
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); 
    }

    jwt.verify(token, process.env.ACESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.sendStatus(403); 
        }
        
        // CORREÇÃO: Salvamos os dados dentro de .user
        // Agora res.locals.user terá { email: '...', perfil: '...' }
        res.locals.user = decoded; 
        next();
    });
}

//adicionar uma rota para autenticacao de requisicoes
//exemplo: router.get('/protected', authenticateToken, (req, res) => { res.json({ message: "Acesso autorizado!" }); });

//lembrar isso.....(?)



module.exports = { authenticateToken: authenticateToken };