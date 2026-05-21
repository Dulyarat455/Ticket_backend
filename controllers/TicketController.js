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
        try{
           
          
          
        }catch(e){
            return res.status(500).send({ error: e.message });
        }
      }




}