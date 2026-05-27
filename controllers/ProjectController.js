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


            const  projectMember =  await tx.projectMember.create({
              data:{
                projectId: project.id,
                userId: parseInt(userId),
                email: email?.trim() || '',
                phone: phone?.trim() || '',
              }
            })
      
            return {
              project,
              projectStatus,
              projectMember
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


      addMember: async (req, res) => {
        try {
          const { projectId, userId, email, phone } = req.body;
      
          // =========================
          // Validate required fields
          // =========================
          if (projectId == null || userId == null) {
            return res.status(400).send({
              message: 'missing_required_fields'
            });
          }
      
          // =========================
          // Check Project exists
          // =========================
          const project = await prisma.project.findFirst({
            where: {
              id: Number(projectId),
              status: 'use'
            },
            select: {
              id: true,
              name: true,
              description: true
            }
          });
      
          if (!project) {
            return res.status(404).send({
              message: 'project_not_found'
            });
          }
      
          // =========================
          // Check User exists
          // =========================
          const user = await prisma.user.findFirst({
            where: {
              id: Number(userId),
              status: 'use'
            },
            select: {
              id: true,
              name: true,
              empNo: true,
              role: true
            }
          });
      
          if (!user) {
            return res.status(404).send({
              message: 'user_not_found'
            });
          }
      
          // =========================
          // Check duplicate member
          // =========================
          const duplicate = await prisma.projectMember.findFirst({
            where: {
              projectId: Number(projectId),
              userId: Number(userId),
              status: 'use'
            }
          });
      
          if (duplicate) {
            return res.status(400).send({
              message: 'member_already_exists'
            });
          }
      
          // =========================
          // Create Project Member
          // =========================
          const createdMember = await prisma.projectMember.create({
            data: {
              projectId: Number(projectId),
              userId: Number(userId),
              email: email || '',
              phone: phone || ''
            }
          });
      
          return res.status(201).send({
            message: 'Add project member success',
            result: {
              id: createdMember.id,
      
              projectId: project.id,
              projectName: project.name,
      
              userId: user.id,
              userName: user.name,
              userEmpNo: user.empNo || '',
              userDisplay: `${user.name}${
                user.empNo ? ` [${user.empNo}]` : ''
              }`,
      
              email: createdMember.email || '',
              phone: createdMember.phone || '',
      
              timeStmp: createdMember.timeStmp,
              status: createdMember.status
            }
          });
      
        } catch (e) {
          return res.status(500).send({
            error: e.message
          });
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