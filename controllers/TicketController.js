const {PrismaClient} = require('../generated/prisma');
const prisma = new PrismaClient();


module.exports = {

    create: async (req, res) => {
        try {
          const {
            projectId,
            userId,
            line,
            priority,
            contact,
            problemTitle,
            problemDetail
          } = req.body;
      
          const files = req.files || [];
      
          // =========================
          // Validate required fields
          // =========================
          const missing = [];
      
          if (!projectId) missing.push("projectId");
          if (!userId) missing.push("userId");
          if (!line) missing.push("line");
          if (!priority) missing.push("priority");
          if (!problemTitle) missing.push("problemTitle");
          if (!problemDetail) missing.push("problemDetail");
      
          if (missing.length) {
            return res.status(400).send({
              message: "Missing required fields",
              missing
            });
          }
      
          const result = await prisma.$transaction(async (tx) => {
            // =========================
            // Check Project exists
            // =========================
            const project = await tx.project.findFirst({
              where: {
                id: Number(projectId),
                status: "use"
              }
            });
      
            if (!project) {
              throw new Error("Project not found");
            }
      
            // =========================
            // Check User exists
            // =========================
            const user = await tx.user.findFirst({
              where: {
                id: Number(userId),
                status: "use"
              }
            });
      
            if (!user) {
              throw new Error("User not found");
            }
      
            // =========================
            // Generate Ticket No
            // ตัวอย่าง: TK202605200001
            // =========================
            const now = new Date();
      
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
      
            const datePrefix = `TK${yyyy}${mm}${dd}`;
      
            const todayStart = new Date(
              yyyy,
              now.getMonth(),
              now.getDate(),
              0,
              0,
              0
            );
      
            const tomorrowStart = new Date(
              yyyy,
              now.getMonth(),
              now.getDate() + 1,
              0,
              0,
              0
            );
      
            const todayCount = await tx.ticket.count({
              where: {
                timeStmp: {
                  gte: todayStart,
                  lt: tomorrowStart
                }
              }
            });
      
            const runningNo = String(todayCount + 1).padStart(4, "0");
            const ticketNo = `${datePrefix}${runningNo}`;
      
            // =========================
            // Create Ticket + FileTicket + TicketStatus
            // =========================
            const createdTicket = await tx.ticket.create({
              data: {
                ticketNo,
                area: line,
                contact: contact || "",
                problemTitle,
                problemDetail,
                projectId: Number(projectId),
                userId: Number(userId),
      
                // schema ใช้ชื่อ piority
                piority: priority,
      
                FileTicket: {
                  create: files.map(file => ({
                    fileName: file.filename
                  }))
                },
      
                TicketStatus: {
                  create: {
                    state: "wait"
                  }
                }
              },
              include: {
                Project: true,
                FileTicket: true,
                TicketStatus: true
              }
            });
      
            const attachments = createdTicket.FileTicket.map(file => ({
              id: file.id,
              fileName: file.fileName,
              fileUrl: `/ticketFile/${file.fileName}`
            }));
      
            const currentTicketStatus = createdTicket.TicketStatus?.[0] || null;
      
            return {
              createdTicket,
              user,
              attachments,
              currentTicketStatus
            };
          });
      
          const {
            createdTicket,
            user,
            attachments,
            currentTicketStatus
          } = result;
      
          return res.status(201).send({
            message: "Create ticket success",
            result: {
              id: createdTicket.id,
              ticketNo: createdTicket.ticketNo,
              projectId: createdTicket.projectId,
              projectName: createdTicket.Project?.name || "",
              userId: createdTicket.userId,
      
              requesterName: user.name || "",
              requesterEmpNo: user.empNo || "",
              requesterDisplay: `${user.name || ""}${user.empNo ? ` [${user.empNo}]` : ""}`,
      
              area: createdTicket.area,
              line: createdTicket.area,
              priority: createdTicket.piority,
              contact: createdTicket.contact,
              problemTitle: createdTicket.problemTitle,
              problemDetail: createdTicket.problemDetail,
              timeStmp: createdTicket.timeStmp,
              status: createdTicket.status,
      
              ticketState: currentTicketStatus?.state || "wait",
              ticketStatusId: currentTicketStatus?.id || null,
      
              attachments
            }
          });
        } catch (e) {
          const statusCode =
            e.message === "Project not found" || e.message === "User not found"
              ? 404
              : 500;
      
          return res.status(statusCode).send({
            message: "Create ticket failed",
            error: e.message
          });
        }
      },

      list: async (req, res) => {
        try {
          const tickets = await prisma.ticket.findMany({
            where: {
              status: "use"
            },
            orderBy: {
              id: "desc"
            },
            include: {
              Project: {
                select: {
                  id: true,
                  name: true,
                  userId: true
                }
              },
              FileTicket: {
                where: {
                  status: "use"
                },
                select: {
                  id: true,
                  fileName: true,
                  timeStmp: true
                },
                orderBy: {
                  id: "asc"
                }
              },
              TicketStatus: {
                where: {
                  status: "use"
                },
                select: {
                  id: true,
                  state: true,
                  inchargeById: true
                },
                orderBy: {
                  id: "desc"
                },
                take: 1
              }
            }
          });
      
          const requestUserIds = tickets
            .map(t => t.userId)
            .filter(id => !!id);
      
          const inchargeUserIds = tickets
            .map(t => t.TicketStatus?.[0]?.inchargeById)
            .filter(id => !!id);
      
          const allUserIds = [...new Set([...requestUserIds, ...inchargeUserIds])];
      
          const users = await prisma.user.findMany({
            where: {
              id: {
                in: allUserIds
              },
              status: "use"
            },
            select: {
              id: true,
              name: true,
              empNo: true
            }
          });
      
          const userMap = new Map(users.map(u => [u.id, u]));
      
          const results = tickets.map(ticket => {
            const requestUser = userMap.get(ticket.userId);
            const latestStatus = ticket.TicketStatus?.[0] || null;
      
            const inchargeUser = latestStatus?.inchargeById
              ? userMap.get(latestStatus.inchargeById)
              : null;
      
            return {
              id: ticket.id,
              ticketNo: ticket.ticketNo,
      
              projectId: ticket.projectId,
              projectName: ticket.Project?.name || "-",
      
              area: ticket.area,
              contact: ticket.contact,
              problemTitle: ticket.problemTitle,
              problemDetail: ticket.problemDetail,
      
              priority: ticket.piority,
      
              state: latestStatus?.state || "-",
              ticketStatusId: latestStatus?.id || null,
      
              requestById: ticket.userId,
              requestByName: requestUser?.name || "-",
              requestByEmpNo: requestUser?.empNo || "-",
              requestByDisplay: requestUser
                ? `${requestUser.name}${requestUser.empNo ? ` [${requestUser.empNo}]` : ""}`
                : "-",
      
              requestAt: ticket.timeStmp,
      
              inchargeById: latestStatus?.inchargeById || null,
              inchargeByName: inchargeUser?.name || "",
              inchargeByEmpNo: inchargeUser?.empNo || "",
              inchargeByDisplay: inchargeUser
                ? `${inchargeUser.name}${inchargeUser.empNo ? ` [${inchargeUser.empNo}]` : ""}`
                : "-",
      
              attachments: ticket.FileTicket.map(file => ({
                id: file.id,
                fileName: file.fileName,
                fileUrl: `/ticketFile/${file.fileName}`,
                timeStmp: file.timeStmp
              }))
            };
          });
      
          return res.status(200).send({
            message: "Fetch ticket list success",
            results
          });
        } catch (e) {
          return res.status(500).send({
            message: "Fetch ticket list failed",
            error: e.message
          });
        }
      },





      ownerIncharge: async (req, res) => {
        try {
          const { userId, ticketId, ticketStatus, reply } = req.body;
      
          if (userId == null || ticketId == null || !ticketStatus) {
            return res.status(400).send({
              message: "missing_required_fields"
            });
          }
      
          const allowStatus = ["onprocess", "deny", "complete"];
      
          if (!allowStatus.includes(ticketStatus)) {
            return res.status(400).send({
              message: "invalid_ticket_status",
              allowStatus
            });
          }
      
          const result = await prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findFirst({
              where: {
                id: Number(ticketId),
                status: "use"
              },
              include: {
                Project: true
              }
            });
      
            if (!ticket) {
              throw new Error("ticket_not_found");
            }
      
            const user = await tx.user.findFirst({
              where: {
                id: Number(userId),
                status: "use"
              },
              select: {
                id: true,
                name: true,
                empNo: true
              }
            });
      
            if (!user) {
              throw new Error("user_not_found");
            }
      
            const createdStatus = await tx.ticketStatus.create({
              data: {
                ticketId: Number(ticketId),
                state: ticketStatus,
                inchargeById: Number(userId),
                remark: reply || ""
              }
            });
      
            let updatedTicket = ticket;
      
            if (ticketStatus === "deny" || ticketStatus === "complete") {
              updatedTicket = await tx.ticket.update({
                where: {
                  id: Number(ticketId)
                },
                data: {
                  reply: reply || ""
                },
                include: {
                  Project: true
                }
              });
            }
      
            return {
              ticket: updatedTicket,
              ticketStatus: createdStatus,
              inchargeUser: user
            };
          });
      
          return res.status(200).send({
            message: "Owner incharge success",
            result: {
              ticketId: result.ticket.id,
              ticketNo: result.ticket.ticketNo,
              projectId: result.ticket.projectId,
              projectName: result.ticket.Project?.name || "",
              state: result.ticketStatus.state,
              ticketStatusId: result.ticketStatus.id,
              inchargeById: result.ticketStatus.inchargeById,
              inchargeByName: result.inchargeUser.name || "",
              inchargeByEmpNo: result.inchargeUser.empNo || "",
              inchargeByDisplay: `${result.inchargeUser.name || ""}${
                result.inchargeUser.empNo ? ` [${result.inchargeUser.empNo}]` : ""
              }`,
              reply: result.ticket.reply || "",
              status: result.ticket.status
            }
          });
        } catch (e) {
          const statusCode =
            e.message === "ticket_not_found" || e.message === "user_not_found"
              ? 404
              : 500;
      
          return res.status(statusCode).send({
            message: "Owner incharge failed",
            error: e.message
          });
        }
      },




      ownerList: async (req, res) => {
        try {
          const { userId } = req.body;
          const ownerUserId = Number(userId || 0);
      
          if (!ownerUserId) {
            return res.status(400).send({
              message: "missing_userId"
            });
          }
      
          const owner = await prisma.user.findFirst({
            where: {
              id: ownerUserId,
              status: "use"
            },
            select: {
              id: true,
              name: true,
              empNo: true
            }
          });
      
          if (!owner) {
            return res.status(404).send({
              message: "owner_not_found"
            });
          }
      
          // =========================
          // Find project ids from ProjectMember
          // =========================
          const projectMemberRows = await prisma.projectMember.findMany({
            where: {
              userId: ownerUserId,
              status: "use"
            },
            select: {
              projectId: true
            }
          });
      
          const projectIds = [
            ...new Set(projectMemberRows.map(row => row.projectId))
          ];
      
          if (!projectIds.length) {
            return res.status(200).send({
              message: "Fetch owner ticket list success",
              owner: {
                id: owner.id,
                name: owner.name,
                empNo: owner.empNo,
                display: `${owner.name}${owner.empNo ? ` [${owner.empNo}]` : ""}`
              },
              projects: [],
              results: []
            });
          }
      
          // =========================
          // Find projects from ProjectMember projectIds
          // =========================
          const projects = await prisma.project.findMany({
            where: {
              id: {
                in: projectIds
              },
              status: "use"
            },
            orderBy: {
              id: "desc"
            },
            include: {
              ProjectStatus: {
                where: {
                  status: "use"
                },
                orderBy: {
                  id: "desc"
                },
                take: 1
              }
            }
          });
      
          const activeProjectIds = projects.map(p => p.id);
      
          if (!activeProjectIds.length) {
            return res.status(200).send({
              message: "Fetch owner ticket list success",
              owner: {
                id: owner.id,
                name: owner.name,
                empNo: owner.empNo,
                display: `${owner.name}${owner.empNo ? ` [${owner.empNo}]` : ""}`
              },
              projects: [],
              results: []
            });
          }
      
          const tickets = await prisma.ticket.findMany({
            where: {
              status: "use",
              projectId: {
                in: activeProjectIds
              }
            },
            orderBy: {
              id: "desc"
            },
            include: {
              Project: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  userId: true
                }
              },
              FileTicket: {
                where: {
                  status: "use"
                },
                orderBy: {
                  id: "asc"
                },
                select: {
                  id: true,
                  fileName: true,
                  timeStmp: true
                }
              },
              TicketStatus: {
                where: {
                  status: "use"
                },
                orderBy: {
                  id: "asc"
                },
                select: {
                  id: true,
                  ticketId: true,
                  state: true,
                  inchargeById: true,
                  remark: true,
                  timeStmp: true
                }
              }
            }
          });
      
          const requestUserIds = tickets
            .map(t => t.userId)
            .filter(id => !!id);
      
          const inchargeUserIds = tickets
            .flatMap(t => t.TicketStatus.map(s => s.inchargeById))
            .filter(id => !!id);
      
          const projectOwnerIds = projects
            .map(p => p.userId)
            .filter(id => !!id);
      
          const allUserIds = [
            ...new Set([
              ...requestUserIds,
              ...inchargeUserIds,
              ...projectOwnerIds
            ])
          ];
      
          const users = await prisma.user.findMany({
            where: {
              id: {
                in: allUserIds
              },
              status: "use"
            },
            select: {
              id: true,
              name: true,
              empNo: true
            }
          });
      
          const userMap = new Map(users.map(u => [u.id, u]));
      
          const results = tickets.map(ticket => {
            const requestUser = userMap.get(ticket.userId);
      
            const latestStatus = ticket.TicketStatus.length
              ? ticket.TicketStatus[ticket.TicketStatus.length - 1]
              : null;
      
            const latestInchargeUser = latestStatus?.inchargeById
              ? userMap.get(latestStatus.inchargeById)
              : null;
      
            const histories = ticket.TicketStatus.map(statusRow => {
              const inchargeUser = statusRow.inchargeById
                ? userMap.get(statusRow.inchargeById)
                : null;
      
              return {
                id: statusRow.id,
                ticketId: statusRow.ticketId,
                state: statusRow.state,
                inchargeById: statusRow.inchargeById,
                inchargeByName: inchargeUser?.name || "",
                inchargeByEmpNo: inchargeUser?.empNo || "",
                inchargeByDisplay: inchargeUser
                  ? `${inchargeUser.name}${inchargeUser.empNo ? ` [${inchargeUser.empNo}]` : ""}`
                  : "-",
                remark: statusRow.remark || "",
                timeStmp: statusRow.timeStmp
              };
            });
      
            return {
              id: ticket.id,
              ticketNo: ticket.ticketNo,
      
              projectId: ticket.projectId,
              projectName: ticket.Project?.name || "-",
      
              area: ticket.area,
              contact: ticket.contact,
              problemTitle: ticket.problemTitle,
              problemDetail: ticket.problemDetail,
              priority: ticket.piority,
              reply: ticket.reply || "",
      
              state: latestStatus?.state || "wait",
              ticketStatusId: latestStatus?.id || null,
      
              requestById: ticket.userId,
              requestByName: requestUser?.name || "-",
              requestByEmpNo: requestUser?.empNo || "-",
              requestByDisplay: requestUser
                ? `${requestUser.name}${requestUser.empNo ? ` [${requestUser.empNo}]` : ""}`
                : "-",
      
              requestAt: ticket.timeStmp,
      
              inchargeById: latestStatus?.inchargeById || null,
              inchargeByName: latestInchargeUser?.name || "",
              inchargeByEmpNo: latestInchargeUser?.empNo || "",
              inchargeByDisplay: latestInchargeUser
                ? `${latestInchargeUser.name}${latestInchargeUser.empNo ? ` [${latestInchargeUser.empNo}]` : ""}`
                : "-",
      
              attachments: ticket.FileTicket.map(file => ({
                id: file.id,
                fileName: file.fileName,
                fileUrl: `/ticketFile/${file.fileName}`,
                timeStmp: file.timeStmp
              })),
      
              histories
            };
          });
      
          const projectResults = projects.map((project, index) => {
            const projectTickets = results.filter(t => t.projectId === project.id);
      
            const open = projectTickets.filter(t => t.state === "wait").length;
            const inProgress = projectTickets.filter(t => t.state === "onprocess").length;
            const resolved = projectTickets.filter(t => t.state === "complete").length;
            const deny = projectTickets.filter(t => t.state === "deny").length;
      
            const latestProjectStatus = project.ProjectStatus?.[0];
            const projectOwner = userMap.get(project.userId);
      
            return {
              id: project.id,
              name: project.name,
              module: project.description || "No description",
              status: latestProjectStatus?.state || "Offline",
              open,
              inProgress,
              resolved,
              deny,
              color: ["blue", "purple", "orange", "green"][index % 4],
      
              ownerId: project.userId,
              ownerName: projectOwner?.name || "-",
              ownerEmpNo: projectOwner?.empNo || "-",
              ownerDisplay: projectOwner
                ? `${projectOwner.name}${projectOwner.empNo ? ` [${projectOwner.empNo}]` : ""}`
                : "-"
            };
          });
      
          return res.status(200).send({
            message: "Fetch owner ticket list success",
            owner: {
              id: owner.id,
              name: owner.name,
              empNo: owner.empNo,
              display: `${owner.name}${owner.empNo ? ` [${owner.empNo}]` : ""}`
            },
            projects: projectResults,
            results
          });
        } catch (e) {
          return res.status(500).send({
            message: "Fetch owner ticket list failed",
            error: e.message
          });
        }
      },




      listNew: async (req, res) => {
        try {
          // =========================
          // Find all active projects
          // =========================
          const projects = await prisma.project.findMany({
            where: {
              status: "use"
            },
            orderBy: {
              id: "desc"
            },
            include: {
              ProjectStatus: {
                where: {
                  status: "use"
                },
                orderBy: {
                  id: "desc"
                },
                take: 1
              }
            }
          });
      
          const activeProjectIds = projects.map(p => p.id);
      
          // =========================
          // Find all active tickets
          // =========================
          const tickets = await prisma.ticket.findMany({
            where: {
              status: "use"
            },
            orderBy: {
              id: "desc"
            },
            include: {
              Project: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  userId: true
                }
              },
              FileTicket: {
                where: {
                  status: "use"
                },
                orderBy: {
                  id: "asc"
                },
                select: {
                  id: true,
                  fileName: true,
                  timeStmp: true
                }
              },
              TicketStatus: {
                where: {
                  status: "use"
                },
                orderBy: {
                  id: "asc"
                },
                select: {
                  id: true,
                  ticketId: true,
                  state: true,
                  inchargeById: true,
                  remark: true,
                  timeStmp: true
                }
              }
            }
          });
      
          // =========================
          // Collect all user ids
          // =========================
          const requestUserIds = tickets
            .map(t => t.userId)
            .filter(id => !!id);
      
          const inchargeUserIds = tickets
            .flatMap(t => t.TicketStatus.map(s => s.inchargeById))
            .filter(id => !!id);
      
          const projectOwnerIds = projects
            .map(p => p.userId)
            .filter(id => !!id);
      
          const allUserIds = [
            ...new Set([
              ...requestUserIds,
              ...inchargeUserIds,
              ...projectOwnerIds
            ])
          ];
      
          const users = allUserIds.length
            ? await prisma.user.findMany({
                where: {
                  id: {
                    in: allUserIds
                  },
                  status: "use"
                },
                select: {
                  id: true,
                  name: true,
                  empNo: true
                }
              })
            : [];
      
          const userMap = new Map(users.map(u => [u.id, u]));
      
          // =========================
          // Map ticket results
          // =========================
          const results = tickets.map(ticket => {
            const requestUser = userMap.get(ticket.userId);
      
            const latestStatus = ticket.TicketStatus.length
              ? ticket.TicketStatus[ticket.TicketStatus.length - 1]
              : null;
      
            const latestInchargeUser = latestStatus?.inchargeById
              ? userMap.get(latestStatus.inchargeById)
              : null;
      
            const histories = ticket.TicketStatus.map(statusRow => {
              const inchargeUser = statusRow.inchargeById
                ? userMap.get(statusRow.inchargeById)
                : null;
      
              return {
                id: statusRow.id,
                ticketId: statusRow.ticketId,
                state: statusRow.state,
                inchargeById: statusRow.inchargeById,
                inchargeByName: inchargeUser?.name || "",
                inchargeByEmpNo: inchargeUser?.empNo || "",
                inchargeByDisplay: inchargeUser
                  ? `${inchargeUser.name}${inchargeUser.empNo ? ` [${inchargeUser.empNo}]` : ""}`
                  : "-",
                remark: statusRow.remark || "",
                timeStmp: statusRow.timeStmp
              };
            });
      
            return {
              id: ticket.id,
              ticketNo: ticket.ticketNo,
      
              projectId: ticket.projectId,
              projectName: ticket.Project?.name || "-",
      
              area: ticket.area,
              contact: ticket.contact,
              problemTitle: ticket.problemTitle,
              problemDetail: ticket.problemDetail,
              priority: ticket.piority,
              reply: ticket.reply || "",
      
              state: latestStatus?.state || "wait",
              ticketStatusId: latestStatus?.id || null,
      
              requestById: ticket.userId,
              requestByName: requestUser?.name || "-",
              requestByEmpNo: requestUser?.empNo || "-",
              requestByDisplay: requestUser
                ? `${requestUser.name}${requestUser.empNo ? ` [${requestUser.empNo}]` : ""}`
                : "-",
      
              requestAt: ticket.timeStmp,
      
              inchargeById: latestStatus?.inchargeById || null,
              inchargeByName: latestInchargeUser?.name || "",
              inchargeByEmpNo: latestInchargeUser?.empNo || "",
              inchargeByDisplay: latestInchargeUser
                ? `${latestInchargeUser.name}${latestInchargeUser.empNo ? ` [${latestInchargeUser.empNo}]` : ""}`
                : "-",
      
              attachments: ticket.FileTicket.map(file => ({
                id: file.id,
                fileName: file.fileName,
                fileUrl: `/ticketFile/${file.fileName}`,
                timeStmp: file.timeStmp
              })),
      
              histories
            };
          });
      
          // =========================
          // Map project summary
          // =========================
          const projectResults = projects.map((project, index) => {
            const projectTickets = results.filter(t => t.projectId === project.id);
      
            const open = projectTickets.filter(t => t.state === "wait").length;
            const inProgress = projectTickets.filter(t => t.state === "onprocess").length;
            const resolved = projectTickets.filter(t => t.state === "complete").length;
            const deny = projectTickets.filter(t => t.state === "deny").length;
      
            const latestProjectStatus = project.ProjectStatus?.[0];
            const projectOwner = userMap.get(project.userId);
      
            return {
              id: project.id,
              name: project.name,
              module: project.description || "No description",
              status: latestProjectStatus?.state || "Offline",
              open,
              inProgress,
              resolved,
              deny,
              color: ["blue", "purple", "orange", "green"][index % 4],
      
              ownerId: project.userId,
              ownerName: projectOwner?.name || "-",
              ownerEmpNo: projectOwner?.empNo || "-",
              ownerDisplay: projectOwner
                ? `${projectOwner.name}${projectOwner.empNo ? ` [${projectOwner.empNo}]` : ""}`
                : "-"
            };
          });
      
          return res.status(200).send({
            message: "Fetch ticket list success",
            projects: projectResults,
            results
          });
      
        } catch (e) {
          return res.status(500).send({
            message: "Fetch ticket list failed",
            error: e.message
          });
        }
      },


      requestTicket: async (req, res) =>{
        try{
          const { userId } = req.body;


        }catch(e){
          return res.status(500).send({ error: e.message });
        }
      },

      

      deleteOwnerTicket: async (req,res) =>{
        try{

        }catch(e){
          return res.status(500).send({ error: e.message });
        }
      }



}