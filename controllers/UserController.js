const {PrismaClient} = require('../generated/prisma');
const prisma = new PrismaClient();

const jwt = require('jsonwebtoken')

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
     },



     signIn: async (req, res) => {
        try {
            const { empNo, password } = req.body;

            if (!empNo || !password) {
                return res.status(400).send({ message: 'missing_empNo_or_password' });
              }


              const u = await prisma.user.findFirst({
                where: {
                  empNo: String(empNo).trim(),
                  password: String(password),
                  status: 'use',
                },
                include: {
                  MapGroupSectionUser: {
                    where: {
                      status: 'use',
                    },
                    include: {
                      Group: true,
                      Section: true,
                    },
                    take: 1,
                  },
                },
              });
          
              if (!u) {
                return res.status(401).send({ message: 'unauthorized' });
              }
              
              const map = u.MapGroupSectionUser?.[0] || null;
    
              const payload = {
                id: u.id,
                empNo: u.empNo,
                name: u.name,
                role: u.role,
                rfId: u.rfId,
                status: u.status,
          
                groupId: map?.groupId || null,
                groupName: map?.Group?.name || null,
                sectionId: map?.sectionId || null,
                sectionName: map?.Section?.name || null,
              };



              const key = process.env.SECRET_KEY;
              if (!key) {
                return res.status(500).send({ message: 'missing_SECRET_KEY' });
              }
          
              const token = jwt.sign(
                {
                  id: payload.id,
                  empNo: payload.empNo,
                  role: payload.role,
                  name: payload.name,
                  groupId: payload.groupId,
                  groupName: payload.groupName,
                  sectionId: payload.sectionId,
                  sectionName: payload.sectionName,
                },
                key,
                { expiresIn: '30d' }
              );
          
              return res.send({ token, ...payload });




        }catch (e){
            return res.status(500).send({ error: e.message });
        }
     } ,


     mapUserGroupSection: async (req,res) =>{
        try{
            const {userId, sectionId, groupId} = req.body;

            if (userId == null  || sectionId == null  || groupId == null) {
                return res.status(400).send({ message: 'missing_required_fields' });
              }

            
            const checkMap =  await prisma.mapGroupSectionUser.findFirst({
                where: {
                    userId: parseInt(userId),
                    sectionId: parseInt(sectionId),
                    groupId: parseInt(groupId)
                },
             })

             if(checkMap){
                return res.status(400).send({ message: 'map_userGroupSection_already' });
             }

             const  mapGroupSectionUser = await prisma.mapGroupSectionUser.create({
                data: {
                    userId: parseInt(userId), 
                    groupId: parseInt(groupId),
                    sectionId: parseInt(sectionId)
                  },
             })

             return res.send({
                message: 'map_groupSectionUser_success',
                data:  mapGroupSectionUser,
            });

        }catch(e){
            return res.status(500).send({ error: e.message });
        }
     }







}

