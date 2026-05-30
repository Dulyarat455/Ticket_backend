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
          const projects = await prisma.project.findMany({
            where: { status: 'use' },
            orderBy: { id: 'desc' },
            include: {
              ProjectStatus: {
                where: { status: 'use' },
                orderBy: { id: 'desc' },
                take: 1
              }
            }
          });
      
          const ownerIds = projects.map(p => p.userId);
          const projectIds = projects.map(p => p.id);
      
          const members = await prisma.projectMember.findMany({
            where: {
              status: 'use',
              projectId: { in: projectIds }
            },
            orderBy: { id: 'asc' }
          });
      
          const memberUserIds = members.map(m => m.userId);
          const allUserIds = [...new Set([...ownerIds, ...memberUserIds])];
      
          const users = await prisma.user.findMany({
            where: {
              id: { in: allUserIds },
              status: 'use'
            },
            select: {
              id: true,
              name: true,
              empNo: true
            }
          });
      
          const userMap = new Map(users.map(u => [u.id, u]));
      
          const results = projects.map(project => {
            const owner = userMap.get(project.userId);
            const latestStatus = project.ProjectStatus?.[0];
      
            const projectMembers = members
              .filter(m => m.projectId === project.id)
              .map(m => {
                const user = userMap.get(m.userId);
      
                return {
                  id: m.id,
                  projectId: m.projectId,
                  userId: m.userId,
                  name: user?.name || '-',
                  empNo: user?.empNo || '-',
                  display: user
                    ? `${user.name}${user.empNo ? ` [${user.empNo}]` : ''}`
                    : '-',
                  email: m.email || '',
                  phone: m.phone || '',
                  timeStmp: m.timeStmp
                };
              });
      
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              email: project.email,
              phone: project.phone,
              userId: project.userId,
      
              ownerName: owner?.name || '-',
              ownerEmpNo: owner?.empNo || '-',
              ownerDisplay: owner
                ? `${owner.name}${owner.empNo ? ` [${owner.empNo}]` : ''}`
                : '-',
      
              timeStmp: project.timeStmp,
              status: project.status,
      
              projectState: latestStatus?.state || '-',
              projectStateTime: latestStatus?.timeStmp || null,
      
              members: projectMembers,
              memberCount: projectMembers.length
            };
          });
      
          return res.send({ results });
        } catch (e) {
          return res.status(500).send({ error: e.message });
        }
      }

      


}