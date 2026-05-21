const {PrismaClient} = require('../generated/prisma');
const prisma = new PrismaClient();


module.exports = {

    create: async (req, res) => {
        try {
          const { name, description, email, phone, userId } = req.body;
      
          const projectName = name?.trim();
          const ownerUserId = parseInt(userId);
      
          if (!projectName || !ownerUserId) {
            return res.status(400).send({ message: 'missing_required_fields' });
          }
      
          const result = await prisma.$transaction(async (tx) => {
            const checkproject = await tx.project.findFirst({
              where: {
                name: projectName,
                userId: ownerUserId,
                status: 'use',
              },
            });
      
            if (checkproject) {
              throw new Error('Project_name_already');
            }
      
            const project = await tx.project.create({
              data: {
                name: projectName,
                userId: ownerUserId,
                description: description?.trim() || '',
                email: email?.trim() || '',
                phone: phone?.trim() || '',
              },
              select: {
                id: true,
                name: true,
                description: true,
                email: true,
                phone: true,
                userId: true,
                status: true,
              },
            });
      
            const projectStatus = await tx.projectStatus.create({
              data: {
                projectId: project.id,
                state: 'online',
              },
              select: {
                id: true,
                projectId: true,
                state: true,
                status: true,
              },
            });
      
            return {
              project,
              projectStatus,
            };
          });
      
          return res.send({
            message: 'add_project_success',
            data: result.project,
            projectStatus: result.projectStatus,
          });
      
        } catch (e) {
          if (e.message === 'Project_name_already') {
            return res.status(400).send({ message: 'Project_name_already' });
          }
      
          return res.status(500).send({ error: e.message });
        }
      },


      list: async (req, res) => {
        try {
          const rows = await prisma.project.findMany({
            where: {
              status: 'use',
            },
            orderBy: {
              id: 'desc',
            },
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  empNo: true,
                },
              },
              ProjectStatus: {
                where: {
                  status: 'use',
                },
                orderBy: {
                  timeStmp: 'desc',
                },
                take: 1,
                select: {
                  id: true,
                  state: true,
                  timeStmp: true,
                },
              },
            },
          });
      
          const results = rows.map((item) => {
            const latestStatus = item.ProjectStatus?.[0] || null;
      
            return {
              id: item.id,
              name: item.name,
              description: item.description,
              email: item.email,
              phone: item.phone,
              userId: item.userId,
              ownerName: item.User?.name || '',
              ownerEmpNo: item.User?.empNo || '',
              timeStmp: item.timeStmp,
      
              // status ของ record project เอง เช่น use
              status: item.status,
      
              // status สำหรับเอาไป show หน้าบ้าน
              projectState: latestStatus?.state || '-',
              projectStateTime: latestStatus?.timeStmp || null,
            };
          });
      
          return res.send({ results });
      
        } catch (e) {
          return res.status(500).send({ error: e.message });
        }
      },

      


}