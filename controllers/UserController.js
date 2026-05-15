const {PrismaClient} = require('../generated/prisma');
const prisma = new PrismaClient();



module.exports = {

     create: async (req, res) => {
        try{
            const {name, password } = req.body;

            const  user = await prisma.user.create({
                data:{
                    name: name,
                    password: password
                },
                select:{
                    id: true,
                    name: true,
                    password: true
                }
            })

            return res.send({
                message: 'add_user_success',
                data: user,
            });


        }catch(e){
            return res.status(500).send({ error: e.message });
        }
     }

}

